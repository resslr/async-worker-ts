import { ProcMap } from "./types.js";
type UseWorkerResult<T extends ProcMap> = {
    [K in keyof T]: T[K];
} & {
    deInit: () => Promise<void>;
};
export default function useWorker<const T extends ProcMap>(procMap: T): UseWorkerResult<T>;
export {};
