/**
 * Enhanced error handling middleware for re-Script web API
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ReScriptError, ErrorCode } from '@re-script/shared-utils';
import { getLoggerService } from '../services/logger.js';
import { config } from '../config/env.js';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
  stack?: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, message: string, code = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function createErrorHandler() {
  return (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const logger = getLoggerService();
    const startTime = Date.now();

    // Generate request ID for tracking
    const requestId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorResponse: ErrorResponse = {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Handle different error types
    if (error instanceof ZodError) {
      // Validation errors from Zod schemas
      errorResponse.statusCode = 400;
      errorResponse.error = 'Validation Error';
      errorResponse.message = 'Request validation failed';
      errorResponse.details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      logger.logWarn('Validation error', {
        requestId,
        endpoint: request.url,
        method: request.method,
        validationErrors: errorResponse.details,
      });

    } else if (error instanceof ReScriptError) {
      // Our custom re-Script errors
      errorResponse.statusCode = getStatusCodeFromErrorCode(error.code);
      errorResponse.error = error.name;
      errorResponse.message = error.message;
      errorResponse.details = {
        code: error.code,
        step: error.step,
        recoverable: error.recoverable,
        suggestions: error.suggestions,
      };

      logger.logError(error, {
        requestId,
        endpoint: request.url,
        method: request.method,
        errorCode: error.code,
        step: error.step,
      });

    } else if (error instanceof ApiError) {
      // API-specific errors
      errorResponse.statusCode = error.statusCode;
      errorResponse.error = error.name;
      errorResponse.message = error.message;
      errorResponse.details = error.details;

      logger.logError(error, {
        requestId,
        endpoint: request.url,
        method: request.method,
        errorCode: error.code,
      });

    } else if ('statusCode' in error && typeof error.statusCode === 'number') {
      // Fastify errors with status codes
      errorResponse.statusCode = error.statusCode;
      errorResponse.error = error.name || 'Request Error';
      errorResponse.message = error.message;

      if (error.statusCode === 413) {
        errorResponse.error = 'Payload Too Large';
        errorResponse.message = 'The uploaded file is too large';
      } else if (error.statusCode === 415) {
        errorResponse.error = 'Unsupported Media Type';
        errorResponse.message = 'The file type is not supported';
      } else if (error.statusCode === 429) {
        errorResponse.error = 'Too Many Requests';
        errorResponse.message = 'Rate limit exceeded. Please try again later.';
      }

      if (error.statusCode >= 500) {
        logger.logError(error as Error, {
          requestId,
          endpoint: request.url,
          method: request.method,
          statusCode: error.statusCode,
        });
      } else {
        logger.logWarn(error.message, {
          requestId,
          endpoint: request.url,
          method: request.method,
          statusCode: error.statusCode,
        });
      }

    } else if (error.name === 'ValidationError') {
      // Generic validation errors
      errorResponse.statusCode = 400;
      errorResponse.error = 'Validation Error';
      errorResponse.message = error.message || 'Invalid request data';

      logger.logWarn(error.message || 'Generic validation error', {
        requestId,
        endpoint: request.url,
        method: request.method,
      });

    } else if (error.message?.includes('multipart')) {
      // Multipart/file upload errors
      errorResponse.statusCode = 400;
      errorResponse.error = 'File Upload Error';
      errorResponse.message = 'Failed to process file upload';

      logger.logError(error, {
        requestId,
        endpoint: request.url,
        method: request.method,
        errorType: 'file_upload',
      });

    } else {
      // Generic server errors
      errorResponse.statusCode = 500;
      errorResponse.error = 'Internal Server Error';
      errorResponse.message = config.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred';

      logger.logError(error, {
        requestId,
        endpoint: request.url,
        method: request.method,
        errorType: 'unexpected',
      });
    }

    // Add stack trace in development
    if (config.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    // Log response time
    const processingTime = Date.now() - startTime;
    logger.logResponse(
      request.method,
      request.url,
      errorResponse.statusCode,
      processingTime,
      { requestId }
    );

    // Send error response
    reply.status(errorResponse.statusCode).send(errorResponse);
  };
}

export function createNotFoundHandler() {
  return (request: FastifyRequest, reply: FastifyReply) => {
    const logger = getLoggerService();
    const requestId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorResponse: ErrorResponse = {
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    logger.logWarn('Route not found', {
      requestId,
      endpoint: request.url,
      method: request.method,
      statusCode: 404,
    });

    reply.status(404).send(errorResponse);
  };
}

// Helper function to map error codes to HTTP status codes
function getStatusCodeFromErrorCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.FILE_NOT_FOUND:
    case ErrorCode.JOB_NOT_FOUND:
      return 404;

    case ErrorCode.INVALID_CONFIG:
    case ErrorCode.VALIDATION_ERROR:
    case ErrorCode.INVALID_FILE_FORMAT:
      return 400;

    case ErrorCode.AUTHENTICATION_ERROR:
      return 401;

    case ErrorCode.AUTHORIZATION_ERROR:
      return 403;

    case ErrorCode.LLM_RATE_LIMITED:
      return 429;

    case ErrorCode.FILE_WRITE_ERROR:
    case ErrorCode.WEBCRACK_FAILED:
    case ErrorCode.BABEL_TRANSFORM_FAILED:
    case ErrorCode.PRETTIER_FAILED:
    case ErrorCode.CHUNKING_FAILED:
    case ErrorCode.LLM_REQUEST_FAILED:
    case ErrorCode.LLM_TIMEOUT:
    case ErrorCode.LLM_QUOTA_EXCEEDED:
    case ErrorCode.LLM_INVALID_RESPONSE:
    case ErrorCode.CACHE_ERROR:
    case ErrorCode.JOB_CANCELLED:
    case ErrorCode.JOB_TIMEOUT:
      return 422; // Unprocessable Entity

    case ErrorCode.MISSING_API_KEY:
      return 503; // Service Unavailable

    default:
      return 500;
  }
}

// Pre-handler for request logging
export function createRequestLogger() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const logger = getLoggerService();
    const requestId = request.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request context
    (request as any).requestId = requestId;

    logger.logRequest(request.method, request.url, {
      requestId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    // Start performance timer
    logger.startPerformanceTimer(`request_${requestId}`, {
      requestId,
      endpoint: request.url,
      method: request.method,
    });

    // Add onResponse hook to log completion
    reply.hijack();
    const originalSend = reply.send.bind(reply);
    reply.send = function(payload: any) {
      const statusCode = reply.statusCode;
      const metrics = logger.endPerformanceTimer(`request_${requestId}`, {
        requestId,
        statusCode,
      });

      logger.logResponse(
        request.method,
        request.url,
        statusCode,
        metrics?.duration || 0,
        { requestId }
      );

      return originalSend(payload);
    };
  };
}