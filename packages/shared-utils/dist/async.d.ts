/**
 * Async utilities for re-script
 */
export declare function delay(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, maxAttempts: number, delayMs?: number, backoffMultiplier?: number): Promise<T>;
export declare function timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
export declare function parallel<T>(tasks: (() => Promise<T>)[], concurrency?: number): Promise<T[]>;
export declare function batchProcess<T, R>(items: T[], processor: (item: T) => Promise<R>, batchSize?: number): Promise<R[]>;
export declare class AsyncQueue<T> {
    private queue;
    private running;
    private concurrency;
    private activeCount;
    constructor(concurrency?: number);
    add(task: () => Promise<T>): Promise<T>;
    private process;
    get size(): number;
    get pending(): number;
}
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=async.d.ts.map