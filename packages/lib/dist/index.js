import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function useWorker(procMap) {
    const worker = new AsyncWorker(procMap);
    return Object.entries(procMap).reduce((acc, [key]) => {
        if (key === "exit")
            return acc;
        if (procMap[key] instanceof Task) {
            return Object.assign(acc, {
                [key]: async () => worker.call(key, ...procMap[key].args),
            });
        }
        return Object.assign(acc, {
            [key]: async (...args) => worker.call(key, ...args),
        });
    }, { exit: () => worker.deInit() });
}
export function task(fn, args) {
    return new Task(fn, args);
}
