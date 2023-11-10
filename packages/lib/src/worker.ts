import { Task } from "./task"
import type { IProcMap, WorkerParentMessage } from "./types"
import {
  deserializeProcMap,
  getProc,
  getProcMapScope,
} from "./worker-shared.js"

let didInit = false
let procMap: IProcMap = {}

onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }

  const { id, path, args, isTask } = e.data as WorkerParentMessage
  if ("yield" in e.data) return
  if ("result" in e.data) return

  const scope = isTask
    ? (() => {
        // @ts-expect-error
        const t = new Task()
        t.reportProgress = (progress: number) => postMessage({ id, progress })
        return t
      })()
    : path.includes(".")
    ? getProcMapScope(procMap, path)
    : procMap

  try {
    Object.assign(globalThis, {
      ["_____yield"]: async (value: any) => {
        postMessage({ id, yield: value })

        return new Promise((resolve) => {
          const handler = async (event: MessageEvent) => {
            if (!("yield" in event.data) && !("result" in event.data)) return
            const {
              id: responseId,
              yield: yieldInputValue,
              result,
            } = event.data
            if (responseId !== id) return

            removeEventListener("message", handler)
            if ("result" in event.data) return resolve(result)
            resolve(yieldInputValue)
          }

          addEventListener("message", handler)
        })
      },
    })

    const result = await getProc(procMap, path).bind(scope)(...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}
