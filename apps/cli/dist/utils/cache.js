/**
 * Advanced caching system with multiple backends
 */
import { createHash } from 'crypto';
import { writeFile, readFile, mkdir, stat, readdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { ReScriptError, ErrorCode } from './errors.js';
/**
 * Memory cache backend
 */
export class MemoryCache {
    cache = new Map();
    maxSize;
    constructor(maxSize = 100 * 1024 * 1024) {
        this.maxSize = maxSize;
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check expiration
        if (entry.expiresAt < new Date()) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttl = 3600) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        const size = this.estimateSize(value);
        const entry = {
            key,
            value,
            createdAt: now,
            expiresAt,
            size,
        };
        // Remove expired entries if we're near capacity
        await this.cleanup();
        // Check if adding this entry would exceed max size
        const currentSize = await this.size();
        if (currentSize + size > this.maxSize) {
            await this.evictLRU(size);
        }
        this.cache.set(key, entry);
    }
    async delete(key) {
        this.cache.delete(key);
    }
    async clear() {
        this.cache.clear();
    }
    async size() {
        let total = 0;
        for (const entry of this.cache.values()) {
            total += entry.size;
        }
        return total;
    }
    /**
     * Remove expired entries
     */
    async cleanup() {
        const now = new Date();
        const toDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt < now) {
                toDelete.push(key);
            }
        }
        for (const key of toDelete) {
            this.cache.delete(key);
        }
    }
    /**
     * Evict least recently used entries
     */
    async evictLRU(spaceNeeded) {
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());
        let freedSpace = 0;
        for (const [key, entry] of entries) {
            this.cache.delete(key);
            freedSpace += entry.size;
            if (freedSpace >= spaceNeeded) {
                break;
            }
        }
    }
    /**
     * Estimate object size in bytes
     */
    estimateSize(obj) {
        return JSON.stringify(obj).length * 2; // Rough estimate
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            entries: this.cache.size,
            sizeBytes: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0),
            maxSizeBytes: this.maxSize,
        };
    }
}
/**
 * File system cache backend
 */
export class FileCache {
    cacheDir;
    maxSize;
    constructor(cacheDir = '.rescript-cache', maxSize = 500 * 1024 * 1024) {
        this.cacheDir = cacheDir;
        this.maxSize = maxSize;
    }
    async get(key) {
        try {
            const filePath = this.getFilePath(key);
            const content = await readFile(filePath, 'utf8');
            const entry = JSON.parse(content);
            // Check expiration
            if (new Date(entry.expiresAt) < new Date()) {
                await unlink(filePath).catch(() => { }); // Ignore errors
                return null;
            }
            return entry.value;
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl = 3600) {
        try {
            await mkdir(this.cacheDir, { recursive: true });
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttl * 1000);
            const content = JSON.stringify(value);
            const entry = {
                key,
                value,
                createdAt: now,
                expiresAt,
                size: content.length,
            };
            const filePath = this.getFilePath(key);
            await mkdir(dirname(filePath), { recursive: true });
            await writeFile(filePath, JSON.stringify(entry), 'utf8');
            // Cleanup if necessary
            await this.cleanup();
        }
        catch (error) {
            throw new ReScriptError(ErrorCode.CACHE_ERROR, `Failed to write cache entry: ${error instanceof Error ? error.message : String(error)}`, 'cache-write');
        }
    }
    async delete(key) {
        try {
            const filePath = this.getFilePath(key);
            await unlink(filePath);
        }
        catch {
            // Ignore errors if file doesn't exist
        }
    }
    async clear() {
        try {
            const files = await readdir(this.cacheDir, { recursive: true });
            const deletePromises = files.map(file => unlink(join(this.cacheDir, file)).catch(() => { }));
            await Promise.all(deletePromises);
        }
        catch {
            // Ignore errors
        }
    }
    async size() {
        try {
            const files = await readdir(this.cacheDir, { recursive: true });
            let total = 0;
            for (const file of files) {
                try {
                    const filePath = join(this.cacheDir, file);
                    const stats = await stat(filePath);
                    total += stats.size;
                }
                catch {
                    // Ignore errors for individual files
                }
            }
            return total;
        }
        catch {
            return 0;
        }
    }
    /**
     * Get file path for cache key
     */
    getFilePath(key) {
        // Create a safe filename from the key
        const hash = createHash('sha256').update(key).digest('hex');
        const prefix = hash.substring(0, 2);
        const filename = hash.substring(2);
        return join(this.cacheDir, prefix, `${filename}.json`);
    }
    /**
     * Remove expired entries and enforce size limits
     */
    async cleanup() {
        try {
            const currentSize = await this.size();
            if (currentSize > this.maxSize) {
                await this.evictOldest(currentSize - this.maxSize);
            }
            // Remove expired entries
            await this.removeExpired();
        }
        catch {
            // Ignore cleanup errors
        }
    }
    /**
     * Remove expired cache entries
     */
    async removeExpired() {
        try {
            const files = await readdir(this.cacheDir, { recursive: true });
            const now = new Date();
            for (const file of files) {
                try {
                    const filePath = join(this.cacheDir, file);
                    const content = await readFile(filePath, 'utf8');
                    const entry = JSON.parse(content);
                    if (new Date(entry.expiresAt) < now) {
                        await unlink(filePath);
                    }
                }
                catch {
                    // Ignore errors for individual files
                }
            }
        }
        catch {
            // Ignore errors
        }
    }
    /**
     * Evict oldest entries to free space
     */
    async evictOldest(spaceToFree) {
        try {
            const files = await readdir(this.cacheDir, { recursive: true });
            const fileStats = [];
            for (const file of files) {
                try {
                    const filePath = join(this.cacheDir, file);
                    const stats = await stat(filePath);
                    fileStats.push({
                        path: filePath,
                        mtime: stats.mtime,
                        size: stats.size,
                    });
                }
                catch {
                    // Ignore errors
                }
            }
            // Sort by modification time (oldest first)
            fileStats.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());
            let freedSpace = 0;
            for (const file of fileStats) {
                if (freedSpace >= spaceToFree)
                    break;
                try {
                    await unlink(file.path);
                    freedSpace += file.size;
                }
                catch {
                    // Ignore errors
                }
            }
        }
        catch {
            // Ignore errors
        }
    }
}
/**
 * Redis cache backend (requires redis client)
 */
export class RedisCache {
    client; // Redis client
    prefix;
    constructor(client, prefix = 'rescript:') {
        this.client = client;
        this.prefix = prefix;
    }
    async get(key) {
        try {
            const fullKey = this.prefix + key;
            const value = await this.client.get(fullKey);
            if (!value)
                return null;
            return JSON.parse(value);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl = 3600) {
        try {
            const fullKey = this.prefix + key;
            const serialized = JSON.stringify(value);
            if (ttl > 0) {
                await this.client.setex(fullKey, ttl, serialized);
            }
            else {
                await this.client.set(fullKey, serialized);
            }
        }
        catch (error) {
            throw new ReScriptError(ErrorCode.CACHE_ERROR, `Redis cache error: ${error instanceof Error ? error.message : String(error)}`, 'cache-redis');
        }
    }
    async delete(key) {
        try {
            const fullKey = this.prefix + key;
            await this.client.del(fullKey);
        }
        catch {
            // Ignore errors
        }
    }
    async clear() {
        try {
            const keys = await this.client.keys(this.prefix + '*');
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
        }
        catch {
            // Ignore errors
        }
    }
    async size() {
        try {
            const keys = await this.client.keys(this.prefix + '*');
            return keys.length;
        }
        catch {
            return 0;
        }
    }
}
/**
 * Cache manager with automatic backend selection
 */
export class CacheManager {
    backend;
    config;
    stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        errors: 0,
    };
    constructor(config, redisClient) {
        this.config = config;
        // Select backend based on configuration
        switch (config.backend) {
            case 'redis':
                if (!redisClient) {
                    console.warn('Redis client not provided, falling back to file cache');
                    this.backend = new FileCache();
                }
                else {
                    this.backend = new RedisCache(redisClient);
                }
                break;
            case 'file':
                this.backend = new FileCache();
                break;
            case 'memory':
            default:
                this.backend = new MemoryCache(config.maxSize * 1024 * 1024); // Convert MB to bytes
                break;
        }
    }
    /**
     * Generate cache key for code and configuration
     */
    generateKey(code, config) {
        const input = {
            code: createHash('sha256').update(code).digest('hex'),
            config: JSON.stringify(config, Object.keys(config).sort()),
        };
        return createHash('sha256')
            .update(JSON.stringify(input))
            .digest('hex')
            .substring(0, 32);
    }
    /**
     * Get cached value
     */
    async get(key) {
        if (!this.config.enabled)
            return null;
        try {
            const value = await this.backend.get(key);
            if (value) {
                this.stats.hits++;
                return value;
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            this.stats.errors++;
            console.warn(`Cache get error: ${error}`);
            return null;
        }
    }
    /**
     * Set cached value
     */
    async set(key, value) {
        if (!this.config.enabled)
            return;
        try {
            await this.backend.set(key, value, this.config.ttl);
            this.stats.sets++;
        }
        catch (error) {
            this.stats.errors++;
            console.warn(`Cache set error: ${error}`);
        }
    }
    /**
     * Delete cached value
     */
    async delete(key) {
        if (!this.config.enabled)
            return;
        try {
            await this.backend.delete(key);
        }
        catch (error) {
            console.warn(`Cache delete error: ${error}`);
        }
    }
    /**
     * Clear all cached values
     */
    async clear() {
        try {
            await this.backend.clear();
            this.resetStats();
        }
        catch (error) {
            console.warn(`Cache clear error: ${error}`);
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? this.stats.hits / total : 0;
        return {
            ...this.stats,
            hitRate,
            backendStats: this.backend.getStats?.(),
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            errors: 0,
        };
    }
    /**
     * Get cache size
     */
    async getSize() {
        try {
            return await this.backend.size();
        }
        catch {
            return 0;
        }
    }
}
/**
 * Create cache manager from configuration
 */
export function createCacheManager(config, redisClient) {
    return new CacheManager(config, redisClient);
}
//# sourceMappingURL=cache.js.map