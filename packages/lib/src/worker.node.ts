import {
  isMainThread,
  workerData,
  parentPort,
  MessagePort,
} from "node:worker_threads"
import type { IProcMap, ISerializedProcMap, WorkerParentMessage } from "./types"

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  parentPort.on("message", async ({ id, path, args }: WorkerParentMessage) => {
    let scope = procMap
    if (path.includes(".")) {
      const keys = path.split(".")
      keys.pop()
      // @ts-ignore
      scope = keys.reduce((acc, key) => acc[key], procMap)
    }

    const pp = parentPort as MessagePort
    try {
      // @ts-expect-error
      globalThis.reportProgress = (progress: number) =>
        pp.postMessage({ data: { id, progress } })

      const fn = getProc(path).bind(scope)
      const isGenerator =
        (fn as any)[Symbol.toStringTag] === "AsyncGeneratorFunction"
      if (isGenerator) {
        const gen = fn(...args)
        let result = await gen.next()
        while (!result.done) {
          pp.postMessage({ data: { id, progress: result.value } })
          result = await gen.next()
        }
        pp.postMessage({ data: { id, result: result.value } })
        return
      }
      const result = await fn(...args)
      pp.postMessage({ data: { id, result } })
    } catch (error) {
      pp.postMessage({ data: { id, error } })
    }
  })

  function getProc(path: string) {
    const keys = path.split(".") as string[]
    let map = procMap as any

    while (keys.length) {
      const k = keys.shift()!
      if (!map[k]) throw new Error(`No procedure found: "${path}"`)
      map = map[k]
      if (typeof map === "function") return map as { (...args: any): any }
    }

    throw new Error(`No procedure found: "${path}"`)
  }
}

function deserializeProcMap(procMap: ISerializedProcMap) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === "string" ? parseFunc(value) : deserializeProcMap(value)
    return acc
  }, {} as IProcMap)
}

// prettier-ignore
function parseFunc(str: string): (...args: any[]) => any {
  const unnamedFunc = "function("
  const unnamedGeneratorFunc = "function*("
  const unnamedAsyncFunc = "async function("
  const unnamedAsyncGeneratorFunc = "async function*("

  // trim and replace to normalize whitespace
  str = str.trim()
  const fn_name_internal = "___thunk___"

  if (str.startsWith("function (")) str = str.replace("function (", unnamedFunc)
  if (str.startsWith("async function (")) str = str.replace("async function (", unnamedAsyncFunc)
  if (str.startsWith("function *(")) str = str.replace("function *(", unnamedGeneratorFunc)
  if (str.startsWith("async function *(")) str = str.replace("async function *(", unnamedAsyncGeneratorFunc)


  // if it's an unnamed function, add a name so we can eval it
  if (str.startsWith(unnamedFunc)) {
    return eval(`(${str.replace(unnamedFunc, `function ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedAsyncFunc)) {
    return eval(`(${str.replace(unnamedAsyncFunc, `async function ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedGeneratorFunc)) {
    return eval(`(${str.replace(unnamedGeneratorFunc, `function* ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedAsyncGeneratorFunc)) {
    return eval(`(${str.replace(unnamedAsyncGeneratorFunc, `async function* ${fn_name_internal}(`)})`)
  }

  return eval(`(${str})`)
}
