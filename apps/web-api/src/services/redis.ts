/**
 * Redis client configuration and connection management
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env.js';

export class RedisService {
  private client: RedisClientType;
  private connected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
      },
      password: config.REDIS_PASSWORD,
      database: config.REDIS_DB,
    });

    // Event handlers
    this.client.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const redisService = new RedisService();