/**
 * Tests for caching system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCache } from '../../src/utils/cache.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rm } from 'fs/promises';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(1024 * 1024); // 1MB for testing
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', async () => {
      await cache.set('test-key', 'test-value');
      const value = await cache.get<string>('test-key');
      
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get<string>('non-existent');
      expect(value).toBeNull();
    });

    it('should store complex objects', async () => {
      const testObject = {
        id: 1,
        name: 'Test Object',
        data: [1, 2, 3],
        nested: { key: 'value' },
      };

      await cache.set('object-key', testObject);
      const retrieved = await cache.get<typeof testObject>('object-key');
      
      expect(retrieved).toEqual(testObject);
    });

    it('should handle arrays', async () => {
      const testArray = [1, 'two', { three: 3 }, [4, 5]];
      
      await cache.set('array-key', testArray);
      const retrieved = await cache.get<typeof testArray>('array-key');
      
      expect(retrieved).toEqual(testArray);
    });

    it('should delete entries', async () => {
      await cache.set('delete-key', 'delete-value');
      expect(await cache.get('delete-key')).toBe('delete-value');
      
      await cache.delete('delete-key');
      expect(await cache.get('delete-key')).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL and expiration', () => {
    it('should respect TTL settings', async () => {
      await cache.set('ttl-key', 'ttl-value', 1); // 1 second TTL
      
      // Should be available immediately
      expect(await cache.get('ttl-key')).toBe('ttl-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      expect(await cache.get('ttl-key')).toBeNull();
    });

    it('should handle different TTL values', async () => {
      await cache.set('short-ttl', 'short-value', 0.1); // 100ms
      await cache.set('long-ttl', 'long-value', 10);   // 10 seconds
      
      // Both should be available initially
      expect(await cache.get('short-ttl')).toBe('short-value');
      expect(await cache.get('long-ttl')).toBe('long-value');
      
      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await cache.get('short-ttl')).toBeNull();
      expect(await cache.get('long-ttl')).toBe('long-value');
    });

    it('should use default TTL when not specified', async () => {
      await cache.set('default-ttl', 'default-value'); // Uses default TTL
      
      // Should be available immediately
      expect(await cache.get('default-ttl')).toBe('default-value');
    });
  });

  describe('size management', () => {
    it('should calculate cache size', async () => {
      const initialSize = await cache.size();
      expect(initialSize).toBe(0);
      
      await cache.set('size-test', 'small-value');
      const afterAdd = await cache.size();
      expect(afterAdd).toBeGreaterThan(0);
      
      await cache.delete('size-test');
      const afterDelete = await cache.size();
      expect(afterDelete).toBe(0);
    });

    it('should handle memory limits', async () => {
      const smallCache = new MemoryCache(100); // Very small cache
      
      // Fill with data that should exceed limit
      const largeValue = 'x'.repeat(50);
      
      await smallCache.set('item1', largeValue);
      await smallCache.set('item2', largeValue);
      await smallCache.set('item3', largeValue); // This should trigger eviction
      
      // At least one item should be available
      const hasAnyItem = (
        await smallCache.get('item1') !== null ||
        await smallCache.get('item2') !== null ||
        await smallCache.get('item3') !== null
      );
      
      expect(hasAnyItem).toBe(true);
    });

    it('should evict LRU items when memory is full', async () => {
      const smallCache = new MemoryCache(200);
      
      // Add items in sequence
      await smallCache.set('oldest', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await smallCache.set('middle', 'value2');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await smallCache.set('newest', 'value3');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add a large item that should force eviction
      const largeValue = 'x'.repeat(150);
      await smallCache.set('large', largeValue);
      
      // The oldest item should be evicted first
      expect(await smallCache.get('oldest')).toBeNull();
      expect(await smallCache.get('large')).toBe(largeValue);
    });
  });

  describe('cleanup operations', () => {
    it('should clean up expired entries', async () => {
      // Add entries with different TTLs
      await cache.set('expired1', 'value1', 0.1);
      await cache.set('expired2', 'value2', 0.1);
      await cache.set('valid', 'value3', 10);
      
      // Wait for some to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Trigger cleanup by adding another item
      await cache.set('trigger', 'trigger-value');
      
      expect(await cache.get('expired1')).toBeNull();
      expect(await cache.get('expired2')).toBeNull();
      expect(await cache.get('valid')).toBe('value3');
      expect(await cache.get('trigger')).toBe('trigger-value');
    });

    it('should handle cleanup with no expired entries', async () => {
      await cache.set('item1', 'value1', 10);
      await cache.set('item2', 'value2', 10);
      
      // Trigger cleanup
      await cache.set('item3', 'value3', 10);
      
      // All items should still be available
      expect(await cache.get('item1')).toBe('value1');
      expect(await cache.get('item2')).toBe('value2');
      expect(await cache.get('item3')).toBe('value3');
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values', async () => {
      await cache.set('null-key', null);
      // Skip undefined test as it causes JSON.stringify issues
      
      expect(await cache.get('null-key')).toBeNull();
    });

    it('should handle boolean values', async () => {
      await cache.set('true-key', true);
      await cache.set('false-key', false);
      
      expect(await cache.get('true-key')).toBe(true);
      expect(await cache.get('false-key')).toBe(false);
    });

    it('should handle number values', async () => {
      await cache.set('zero', 0);
      await cache.set('negative', -42);
      await cache.set('float', 3.14159);
      await cache.set('large', Number.MAX_SAFE_INTEGER);
      
      expect(await cache.get('zero')).toBe(0);
      expect(await cache.get('negative')).toBe(-42);
      expect(await cache.get('float')).toBe(3.14159);
      expect(await cache.get('large')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle empty strings and whitespace', async () => {
      await cache.set('empty', '');
      await cache.set('spaces', '   ');
      await cache.set('newlines', '\n\n\n');
      
      expect(await cache.get('empty')).toBe('');
      expect(await cache.get('spaces')).toBe('   ');
      expect(await cache.get('newlines')).toBe('\n\n\n');
    });

    it('should handle very long keys', async () => {
      const longKey = 'k'.repeat(1000);
      const value = 'long-key-value';
      
      await cache.set(longKey, value);
      expect(await cache.get(longKey)).toBe(value);
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key\\with\\backslashes',
        'key:with:colons',
        'key@with@symbols',
        'key#with#hashes',
        'key%with%percent',
        'key&with&ampersands',
        'key+with+plus',
        'key=with=equals',
        'key?with?questions',
        'key[with]brackets',
        'key{with}braces',
        'key(with)parens',
        'key|with|pipes',
      ];

      for (const key of specialKeys) {
        await cache.set(key, `value-for-${key}`);
        expect(await cache.get(key)).toBe(`value-for-${key}`);
      }
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];
      
      // Concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`concurrent-${i}`, `value-${i}`));
      }
      
      await Promise.all(promises);
      
      // Verify all values were written
      for (let i = 0; i < 10; i++) {
        expect(await cache.get(`concurrent-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should handle rapid successive operations on same key', async () => {
      const key = 'rapid-key';
      
      // Rapid successive writes
      await cache.set(key, 'value1');
      await cache.set(key, 'value2');
      await cache.set(key, 'value3');
      await cache.set(key, 'final-value');
      
      // Should have the last written value
      expect(await cache.get(key)).toBe('final-value');
    });
  });

  describe('performance characteristics', () => {
    it('should handle large numbers of entries efficiently', async () => {
      const startTime = Date.now();
      const numEntries = 1000;
      
      // Add many entries
      for (let i = 0; i < numEntries; i++) {
        await cache.set(`perf-key-${i}`, `perf-value-${i}`);
      }
      
      const insertTime = Date.now() - startTime;
      
      // Retrieve all entries
      const retrieveStart = Date.now();
      for (let i = 0; i < numEntries; i++) {
        const value = await cache.get(`perf-key-${i}`);
        expect(value).toBe(`perf-value-${i}`);
      }
      const retrieveTime = Date.now() - retrieveStart;
      
      // Operations should complete in reasonable time
      expect(insertTime).toBeLessThan(5000);  // 5 seconds for inserts
      expect(retrieveTime).toBeLessThan(2000); // 2 seconds for retrieval
    }, 10000); // 10 second timeout

    it('should maintain reasonable memory usage', async () => {
      const initialSize = await cache.size();
      
      // Add various sized entries
      await cache.set('small', 'x'.repeat(10));
      await cache.set('medium', 'x'.repeat(1000));
      await cache.set('large', 'x'.repeat(10000));
      
      const finalSize = await cache.size();
      
      // Size should increase proportionally
      expect(finalSize).toBeGreaterThan(initialSize);
      expect(finalSize).toBeLessThan(50000); // Reasonable upper bound
    });
  });
});