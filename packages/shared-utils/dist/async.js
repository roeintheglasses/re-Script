/**
 * Async utilities for re-script
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function retry(fn, maxAttempts, delayMs = 1000, backoffMultiplier = 2) {
    let lastError;
    let currentDelay = delayMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxAttempts) {
                throw lastError;
            }
            await delay(currentDelay);
            currentDelay *= backoffMultiplier;
        }
    }
    throw lastError;
}
export async function timeout(promise, ms) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]);
}
export async function parallel(tasks, concurrency = 3) {
    const results = [];
    const executing = [];
    for (const [index, task] of tasks.entries()) {
        const promise = task().then(result => {
            results[index] = result;
        });
        executing.push(promise);
        if (executing.length >= concurrency) {
            await Promise.race(executing);
            executing.splice(executing.findIndex(p => p === promise), 1);
        }
    }
    await Promise.all(executing);
    return results;
}
export async function batchProcess(items, processor, batchSize = 10) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }
    return results;
}
export class AsyncQueue {
    queue = [];
    running = false;
    concurrency;
    activeCount = 0;
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
    }
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                    return result;
                }
                catch (error) {
                    reject(error);
                    throw error;
                }
            });
            this.process();
        });
    }
    async process() {
        if (this.activeCount >= this.concurrency || this.queue.length === 0) {
            return;
        }
        this.activeCount++;
        const task = this.queue.shift();
        try {
            await task();
        }
        finally {
            this.activeCount--;
            this.process();
        }
    }
    get size() {
        return this.queue.length;
    }
    get pending() {
        return this.activeCount;
    }
}
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
