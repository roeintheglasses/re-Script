/**
 * Comprehensive logging service for re-Script web API
 */

import { FastifyBaseLogger } from 'fastify';
import { config } from '../config/env.js';

export interface LogContext {
  jobId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  processingTime?: number;
  error?: Error;
  [key: string]: any;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
}

export class LoggerService {
  private logger: FastifyBaseLogger;
  private performanceMetrics: Map<string, { start: number; memory: NodeJS.MemoryUsage }> = new Map();

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
  }

  // Request logging
  logRequest(method: string, url: string, context: LogContext = {}): void {
    this.logger.info({
      type: 'request',
      method,
      url,
      ...context,
    }, `${method} ${url}`);
  }

  logResponse(method: string, url: string, statusCode: number, duration: number, context: LogContext = {}): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level]({
      type: 'response',
      method,
      url,
      statusCode,
      duration,
      ...context,
    }, `${method} ${url} ${statusCode} - ${duration}ms`);
  }

  // Job processing logging
  logJobStart(jobId: string, context: LogContext = {}): void {
    this.logger.info({
      type: 'job_start',
      jobId,
      ...context,
    }, `Job ${jobId} started processing`);
  }

  logJobProgress(jobId: string, progress: any, context: LogContext = {}): void {
    this.logger.debug({
      type: 'job_progress',
      jobId,
      progress,
      ...context,
    }, `Job ${jobId} progress: ${progress.percentage}%`);
  }

  logJobComplete(jobId: string, duration: number, context: LogContext = {}): void {
    this.logger.info({
      type: 'job_complete',
      jobId,
      duration,
      ...context,
    }, `Job ${jobId} completed successfully in ${duration}ms`);
  }

  logJobError(jobId: string, error: Error, context: LogContext = {}): void {
    this.logger.error({
      type: 'job_error',
      jobId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    }, `Job ${jobId} failed: ${error.message}`);
  }

  // File upload logging
  logFileUpload(filename: string, size: number, context: LogContext = {}): void {
    this.logger.info({
      type: 'file_upload',
      filename,
      size,
      ...context,
    }, `File uploaded: ${filename} (${Math.round(size / 1024)}KB)`);
  }

  logFileUploadError(filename: string, error: Error, context: LogContext = {}): void {
    this.logger.error({
      type: 'file_upload_error',
      filename,
      error: {
        name: error.name,
        message: error.message,
      },
      ...context,
    }, `File upload failed: ${filename} - ${error.message}`);
  }

  // Error logging with different levels
  logError(error: Error, context: LogContext = {}): void {
    this.logger.error({
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: config.NODE_ENV === 'development' ? error.stack : undefined,
      },
      ...context,
    }, error.message);
  }

  logWarn(message: string, context: LogContext = {}): void {
    this.logger.warn({
      type: 'warning',
      ...context,
    }, message);
  }

  logInfo(message: string, context: LogContext = {}): void {
    this.logger.info({
      type: 'info',
      ...context,
    }, message);
  }

  logDebug(message: string, context: LogContext = {}): void {
    this.logger.debug({
      type: 'debug',
      ...context,
    }, message);
  }

  // Performance monitoring
  startPerformanceTimer(operationId: string, context: LogContext = {}): void {
    this.performanceMetrics.set(operationId, {
      start: Date.now(),
      memory: process.memoryUsage(),
    });

    this.logger.debug({
      type: 'performance_start',
      operationId,
      ...context,
    }, `Starting operation: ${operationId}`);
  }

  endPerformanceTimer(operationId: string, context: LogContext = {}): PerformanceMetrics | null {
    const startData = this.performanceMetrics.get(operationId);
    if (!startData) {
      this.logWarn(`Performance timer not found for operation: ${operationId}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - startData.start;
    const currentMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      duration,
      memoryUsage: {
        rss: currentMemory.rss - startData.memory.rss,
        heapTotal: currentMemory.heapTotal - startData.memory.heapTotal,
        heapUsed: currentMemory.heapUsed - startData.memory.heapUsed,
        external: currentMemory.external - startData.memory.external,
        arrayBuffers: currentMemory.arrayBuffers - startData.memory.arrayBuffers,
      },
      timestamp: new Date().toISOString(),
    };

    this.logger.info({
      type: 'performance_end',
      operationId,
      metrics,
      ...context,
    }, `Operation ${operationId} completed in ${duration}ms`);

    this.performanceMetrics.delete(operationId);
    return metrics;
  }

  // Service health logging
  logServiceHealth(service: string, status: 'healthy' | 'degraded' | 'unhealthy', context: LogContext = {}): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    this.logger[level]({
      type: 'service_health',
      service,
      status,
      ...context,
    }, `Service ${service} status: ${status}`);
  }

  // Rate limiting and security logging
  logRateLimit(endpoint: string, ip: string, context: LogContext = {}): void {
    this.logger.warn({
      type: 'rate_limit',
      endpoint,
      ip,
      ...context,
    }, `Rate limit exceeded for ${endpoint} from ${ip}`);
  }

  logSecurityEvent(event: string, context: LogContext = {}): void {
    this.logger.warn({
      type: 'security_event',
      event,
      ...context,
    }, `Security event: ${event}`);
  }

  // Queue and Redis logging
  logQueueEvent(event: 'job_added' | 'job_completed' | 'job_failed' | 'queue_stalled', data: any, context: LogContext = {}): void {
    const level = event === 'job_failed' ? 'error' : 'info';
    this.logger[level]({
      type: 'queue_event',
      event,
      data,
      ...context,
    }, `Queue event: ${event}`);
  }

  logRedisEvent(event: 'connected' | 'disconnected' | 'error', context: LogContext = {}): void {
    const level = event === 'error' ? 'error' : event === 'disconnected' ? 'warn' : 'info';
    this.logger[level]({
      type: 'redis_event',
      event,
      ...context,
    }, `Redis ${event}`);
  }

  // Cleanup performance metrics on service shutdown
  cleanup(): void {
    this.performanceMetrics.clear();
    this.logger.info('Logger service cleaned up');
  }
}

// Singleton pattern for logger service
let loggerService: LoggerService | null = null;

export function createLoggerService(logger: FastifyBaseLogger): LoggerService {
  if (!loggerService) {
    loggerService = new LoggerService(logger);
  }
  return loggerService;
}

export function getLoggerService(): LoggerService {
  if (!loggerService) {
    throw new Error('Logger service not initialized. Call createLoggerService first.');
  }
  return loggerService;
}