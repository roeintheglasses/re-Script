/**
 * Cache types and interfaces
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  size: number;
}

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  backend: 'memory' | 'file' | 'redis';
  maxSize: number;
}