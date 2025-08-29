/**
 * Health check routes for monitoring and status
 */

import { FastifyPluginAsync } from 'fastify';
import { config } from '../config/env.js';
import { redisService } from '../services/redis.js';
import { jobQueueService } from '../services/queue.js';

export const healthRoutes: FastifyPluginAsync = async (server) => {
  // Basic health check
  server.get('/', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
    };
  });

  // Detailed status check
  server.get('/status', async () => {
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
      },
      cpu: {
        loadAverage: typeof (process as any).loadavg === 'function' ? (process as any).loadavg() : [0, 0, 0],
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  });

  // Ready check for orchestration
  server.get('/ready', async () => {
    const redisHealth = await redisService.healthCheck();
    const queueStats = await jobQueueService.getQueueStats();
    
    return {
      status: redisHealth ? 'ready' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        server: true,
        redis: redisHealth,
        queue: {
          connected: redisHealth,
          stats: queueStats,
        },
      },
    };
  });

  // Liveness probe
  server.get('/live', async () => {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  });
};