import { Task } from "./task.js";
import { IProcMap, AsyncWorkerClient } from "./types.js";
export default function useWorker<const T extends IProcMap>(procMap: T): AsyncWorkerClient<T>;
export declare function task<const T extends readonly unknown[], U extends T, V>(fn: (...args: U) => V, args: T | (() => readonly [...T])): Task<T, U, V>;
