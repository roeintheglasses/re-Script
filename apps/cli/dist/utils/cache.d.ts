/**
 * Advanced caching system with multiple backends
 */
import { CacheBackend, CachingConfig } from '../types.js';
/**
 * Memory cache backend
 */
export declare class MemoryCache implements CacheBackend {
    private cache;
    private maxSize;
    constructor(maxSize?: number);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    size(): Promise<number>;
    /**
     * Remove expired entries
     */
    private cleanup;
    /**
     * Evict least recently used entries
     */
    private evictLRU;
    /**
     * Estimate object size in bytes
     */
    private estimateSize;
    /**
     * Get cache statistics
     */
    getStats(): {
        entries: number;
        sizeBytes: number;
        maxSizeBytes: number;
        hitRate?: number;
    };
}
/**
 * File system cache backend
 */
export declare class FileCache implements CacheBackend {
    private cacheDir;
    private maxSize;
    constructor(cacheDir?: string, maxSize?: number);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    size(): Promise<number>;
    /**
     * Get file path for cache key
     */
    private getFilePath;
    /**
     * Remove expired entries and enforce size limits
     */
    private cleanup;
    /**
     * Remove expired cache entries
     */
    private removeExpired;
    /**
     * Evict oldest entries to free space
     */
    private evictOldest;
}
/**
 * Redis cache backend (requires redis client)
 */
export declare class RedisCache implements CacheBackend {
    private client;
    private prefix;
    constructor(client: any, prefix?: string);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    size(): Promise<number>;
}
/**
 * Cache manager with automatic backend selection
 */
export declare class CacheManager {
    private backend;
    private config;
    private stats;
    constructor(config: CachingConfig, redisClient?: any);
    /**
     * Generate cache key for code and configuration
     */
    generateKey(code: string, config: Record<string, unknown>): string;
    /**
     * Get cached value
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set cached value
     */
    set<T>(key: string, value: T): Promise<void>;
    /**
     * Delete cached value
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cached values
     */
    clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): {
        hits: number;
        misses: number;
        sets: number;
        errors: number;
        hitRate: number;
        backendStats?: any;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Get cache size
     */
    getSize(): Promise<number>;
}
/**
 * Create cache manager from configuration
 */
export declare function createCacheManager(config: CachingConfig, redisClient?: any): CacheManager;
//# sourceMappingURL=cache.d.ts.map