/**
 * Comprehensive error handling utilities for re-Script v2
 */

import { ProcessingError } from '../types.js';

export enum ErrorCode {
  // Input/Output Errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  
  // Configuration Errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_API_KEY = 'MISSING_API_KEY',
  INVALID_MODEL = 'INVALID_MODEL',
  
  // Processing Errors
  WEBCRACK_FAILED = 'WEBCRACK_FAILED',
  BABEL_TRANSFORM_FAILED = 'BABEL_TRANSFORM_FAILED',
  PRETTIER_FAILED = 'PRETTIER_FAILED',
  CHUNKING_FAILED = 'CHUNKING_FAILED',
  
  // LLM Errors
  LLM_REQUEST_FAILED = 'LLM_REQUEST_FAILED',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',
  LLM_QUOTA_EXCEEDED = 'LLM_QUOTA_EXCEEDED',
  LLM_INVALID_RESPONSE = 'LLM_INVALID_RESPONSE',
  
  // Cache Errors
  CACHE_ERROR = 'CACHE_ERROR',
  
  // Unknown/Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ReScriptError extends Error {
  public readonly code: ErrorCode;
  public readonly step: string;
  public readonly recoverable: boolean;
  public readonly suggestions: string[];
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    step: string,
    recoverable = false,
    suggestions: string[] = [],
    originalError?: Error
  ) {
    super(message);
    this.name = 'ReScriptError';
    this.code = code;
    this.step = step;
    this.recoverable = recoverable;
    this.suggestions = suggestions;
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReScriptError);
    }
  }

  toProcessingError(): ProcessingError {
    return {
      code: this.code,
      message: this.message,
      stack: this.stack,
      step: this.step,
      recoverable: this.recoverable,
      suggestions: this.suggestions,
    };
  }

  static fromError(error: unknown, step: string): ReScriptError {
    if (error instanceof ReScriptError) {
      return error;
    }

    if (error instanceof Error) {
      return new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        step,
        false,
        [],
        error
      );
    }

    return new ReScriptError(
      ErrorCode.UNKNOWN_ERROR,
      String(error),
      step,
      false,
      []
    );
  }
}

export class FileNotFoundError extends ReScriptError {
  constructor(filePath: string, step = 'file-input') {
    super(
      ErrorCode.FILE_NOT_FOUND,
      `File not found: ${filePath}`,
      step,
      false,
      [
        'Check if the file path is correct',
        'Ensure the file exists and is readable',
        'Try using an absolute path',
      ]
    );
  }
}

export class InvalidConfigError extends ReScriptError {
  constructor(message: string, suggestions: string[] = []) {
    super(
      ErrorCode.INVALID_CONFIG,
      `Configuration error: ${message}`,
      'config-validation',
      false,
      [
        'Check your configuration file syntax',
        'Validate against the schema',
        ...suggestions,
      ]
    );
  }
}

export class MissingApiKeyError extends ReScriptError {
  constructor(provider: string) {
    super(
      ErrorCode.MISSING_API_KEY,
      `API key required for ${provider}`,
      'provider-setup',
      false,
      [
        `Set the API key in your config file`,
        `Use environment variable for ${provider.toUpperCase()}_API_KEY`,
        'Check provider documentation for API key setup',
      ]
    );
  }
}

export class LLMRequestError extends ReScriptError {
  constructor(
    provider: string,
    message: string,
    recoverable = true,
    originalError?: Error
  ) {
    const suggestions = [
      'Check your API key and quota',
      'Verify the model name is correct',
      'Try reducing the input size',
    ];

    if (recoverable) {
      suggestions.push('The request will be retried automatically');
    }

    super(
      ErrorCode.LLM_REQUEST_FAILED,
      `${provider} request failed: ${message}`,
      'llm-processing',
      recoverable,
      suggestions,
      originalError
    );
  }
}

export class WebcrackError extends ReScriptError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorCode.WEBCRACK_FAILED,
      `Webcrack processing failed: ${message}`,
      'webcrack',
      true,
      [
        'The code may not be minified or obfuscated',
        'Try processing without webcrack step',
        'Check if the input is valid JavaScript',
      ],
      originalError
    );
  }
}

export class BabelTransformError extends ReScriptError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorCode.BABEL_TRANSFORM_FAILED,
      `Babel transformation failed: ${message}`,
      'babel-transform',
      true,
      [
        'The code may have syntax errors',
        'Try skipping custom Babel transformations',
        'Check the input code validity',
      ],
      originalError
    );
  }
}

export class PrettierError extends ReScriptError {
  constructor(message: string, originalError?: Error) {
    super(
      ErrorCode.PRETTIER_FAILED,
      `Code formatting failed: ${message}`,
      'prettier',
      true,
      [
        'The code may have syntax errors',
        'Try different prettier parser options',
        'Skip formatting step if necessary',
      ],
      originalError
    );
  }
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  canRecover(error: ReScriptError): boolean;
  recover(error: ReScriptError, context: unknown): Promise<unknown>;
}

export class WebcrackRecovery implements RecoveryStrategy {
  canRecover(error: ReScriptError): boolean {
    return error.code === ErrorCode.WEBCRACK_FAILED;
  }

  async recover(error: ReScriptError, context: { code: string }): Promise<{ code: string }> {
    // Skip webcrack step and return original code
    console.warn('Webcrack failed, skipping deobfuscation step');
    return { code: context.code };
  }
}

export class BabelRecovery implements RecoveryStrategy {
  canRecover(error: ReScriptError): boolean {
    return error.code === ErrorCode.BABEL_TRANSFORM_FAILED;
  }

  async recover(error: ReScriptError, context: { code: string }): Promise<{ code: string }> {
    // Skip Babel transformations and return original code
    console.warn('Babel transformation failed, skipping AST transformations');
    return { code: context.code };
  }
}

export class PrettierRecovery implements RecoveryStrategy {
  canRecover(error: ReScriptError): boolean {
    return error.code === ErrorCode.PRETTIER_FAILED;
  }

  async recover(error: ReScriptError, context: { code: string }): Promise<{ code: string }> {
    // Skip Prettier formatting and return original code
    console.warn('Prettier formatting failed, returning unformatted code');
    return { code: context.code };
  }
}

/**
 * Error recovery manager
 */
export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [
    new WebcrackRecovery(),
    new BabelRecovery(),
    new PrettierRecovery(),
  ];

  async attemptRecovery(error: ReScriptError, context: unknown): Promise<unknown> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          return await strategy.recover(error, context);
        } catch (recoveryError) {
          console.warn(`Recovery strategy failed: ${recoveryError}`);
        }
      }
    }
    throw error; // No recovery possible
  }

  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }
}

/**
 * Utility functions for error handling
 */
export function isRecoverableError(error: unknown): boolean {
  return error instanceof ReScriptError && error.recoverable;
}

export function formatErrorMessage(error: ProcessingError): string {
  const lines = [
    `❌ Error in ${error.step}: ${error.message}`,
  ];

  if (error.suggestions && error.suggestions.length > 0) {
    lines.push('');
    lines.push('💡 Suggestions:');
    error.suggestions.forEach(suggestion => {
      lines.push(`  • ${suggestion}`);
    });
  }

  if (error.recoverable) {
    lines.push('');
    lines.push('🔄 This error is recoverable - attempting to continue...');
  }

  return lines.join('\n');
}

export function getErrorMetrics(errors: ProcessingError[]): {
  total: number;
  recoverable: number;
  byStep: Record<string, number>;
  byCode: Record<string, number>;
} {
  const metrics = {
    total: errors.length,
    recoverable: 0,
    byStep: {} as Record<string, number>,
    byCode: {} as Record<string, number>,
  };

  errors.forEach(error => {
    if (error.recoverable) {
      metrics.recoverable++;
    }

    metrics.byStep[error.step] = (metrics.byStep[error.step] || 0) + 1;
    metrics.byCode[error.code] = (metrics.byCode[error.code] || 0) + 1;
  });

  return metrics;
}