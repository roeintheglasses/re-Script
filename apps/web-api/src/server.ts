/**
 * Fastify server setup with plugins and routes
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { config } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { jobRoutes } from './routes/jobs.js';
import { eventsRoutes } from './routes/events.js';
import { uploadRoutes } from './routes/upload.js';
import { redisService } from './services/redis.js';
import { jobQueueService } from './services/queue.js';
import { jobProcessorService } from './services/processor.js';
import { createLoggerService } from './services/logger.js';
import { 
  createErrorHandler, 
  createNotFoundHandler, 
  createRequestLogger 
} from './middleware/error-handler.js';

export async function createServer() {
  const server = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      } : undefined,
    },
    disableRequestLogging: config.NODE_ENV === 'production',
    trustProxy: true,
  });

  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: false, // Disable for development
  });

  await server.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await server.register(rateLimit, {
    max: config.RATE_LIMIT,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
    }),
  });

  // File upload support
  await server.register(multipart, {
    limits: {
      fileSize: config.MAX_FILE_SIZE,
    },
    attachFieldsToBody: true,
  });

  // Initialize logger service
  const loggerService = createLoggerService(server.log);
  loggerService.logInfo('Logger service initialized');

  // Add request/response logging hooks
  server.addHook('onRequest', async (request, reply) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    (request as any).requestId = requestId;
    
    loggerService.logRequest(request.method, request.url, {
      requestId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });
    
    loggerService.startPerformanceTimer(`request_${requestId}`);
  });

  server.addHook('onResponse', async (request, reply) => {
    const requestId = (request as any).requestId;
    const metrics = loggerService.endPerformanceTimer(`request_${requestId}`);
    
    loggerService.logResponse(
      request.method,
      request.url,
      reply.statusCode,
      metrics?.duration || 0,
      { requestId }
    );
  });

  // Initialize services
  try {
    loggerService.startPerformanceTimer('service_initialization');
    
    await redisService.connect();
    loggerService.logServiceHealth('redis', 'healthy');
    
    await jobProcessorService.initialize();
    loggerService.logServiceHealth('job-processor', 'healthy');
    
    const metrics = loggerService.endPerformanceTimer('service_initialization');
    loggerService.logInfo(`Services initialized successfully in ${metrics?.duration}ms`);
  } catch (error) {
    loggerService.logError(error as Error, { operation: 'service_initialization' });
    loggerService.logServiceHealth('system', 'unhealthy');
    throw error;
  }

  // Register routes
  await server.register(healthRoutes, { prefix: '/health' });
  await server.register(jobRoutes, { prefix: '/api/jobs' });
  await server.register(eventsRoutes, { prefix: '/api/events' });
  await server.register(uploadRoutes, { prefix: '/api/upload' });

  // Enhanced error handlers
  server.setErrorHandler(createErrorHandler());
  server.setNotFoundHandler(createNotFoundHandler());

  return server;
}