/**
 * Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  ReScriptError, 
  ErrorCode, 
  FileNotFoundError, 
  InvalidConfigError,
  MissingApiKeyError,
  LLMRequestError,
  WebcrackError,
  BabelTransformError,
  PrettierError,
  ErrorRecoveryManager,
  isRecoverableError,
  formatErrorMessage,
  getErrorMetrics,
} from '../../src/utils/errors.js';

describe('ReScriptError', () => {
  it('should create error with all properties', () => {
    const error = new ReScriptError(
      ErrorCode.FILE_NOT_FOUND,
      'Test message',
      'test-step',
      true,
      ['suggestion 1', 'suggestion 2']
    );

    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(error.message).toBe('Test message');
    expect(error.step).toBe('test-step');
    expect(error.recoverable).toBe(true);
    expect(error.suggestions).toEqual(['suggestion 1', 'suggestion 2']);
  });

  it('should convert to ProcessingError', () => {
    const error = new ReScriptError(
      ErrorCode.LLM_REQUEST_FAILED,
      'API request failed',
      'llm-processing',
      false,
      ['Check API key']
    );

    const processingError = error.toProcessingError();
    expect(processingError.code).toBe(ErrorCode.LLM_REQUEST_FAILED);
    expect(processingError.message).toBe('API request failed');
    expect(processingError.step).toBe('llm-processing');
    expect(processingError.recoverable).toBe(false);
    expect(processingError.suggestions).toEqual(['Check API key']);
  });

  it('should create from generic Error', () => {
    const originalError = new Error('Generic error');
    const reScriptError = ReScriptError.fromError(originalError, 'test-step');

    expect(reScriptError.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(reScriptError.message).toBe('Generic error');
    expect(reScriptError.step).toBe('test-step');
    expect(reScriptError.originalError).toBe(originalError);
  });

  it('should preserve existing ReScriptError', () => {
    const originalError = new ReScriptError(
      ErrorCode.FILE_NOT_FOUND,
      'Original message',
      'original-step'
    );
    
    const preservedError = ReScriptError.fromError(originalError, 'new-step');
    expect(preservedError).toBe(originalError);
  });
});

describe('Specific Error Classes', () => {
  it('should create FileNotFoundError with proper suggestions', () => {
    const error = new FileNotFoundError('/path/to/file.js');
    
    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND);
    expect(error.message).toContain('/path/to/file.js');
    expect(error.suggestions.length).toBeGreaterThan(0);
    expect(error.suggestions[0]).toContain('Check if the file path is correct');
  });

  it('should create InvalidConfigError with custom suggestions', () => {
    const error = new InvalidConfigError('Invalid model name', ['Use a valid model']);
    
    expect(error.code).toBe(ErrorCode.INVALID_CONFIG);
    expect(error.message).toContain('Invalid model name');
    expect(error.suggestions).toContain('Use a valid model');
  });

  it('should create MissingApiKeyError with provider-specific suggestions', () => {
    const error = new MissingApiKeyError('openai');
    
    expect(error.code).toBe(ErrorCode.MISSING_API_KEY);
    expect(error.message).toContain('openai');
    expect(error.suggestions.some(s => s.includes('OPENAI_API_KEY'))).toBe(true);
  });

  it('should create LLMRequestError as recoverable by default', () => {
    const error = new LLMRequestError('anthropic', 'Rate limited');
    
    expect(error.code).toBe(ErrorCode.LLM_REQUEST_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.suggestions.some(s => s.includes('retried'))).toBe(true);
  });

  it('should create WebcrackError as recoverable', () => {
    const error = new WebcrackError('Parsing failed');
    
    expect(error.code).toBe(ErrorCode.WEBCRACK_FAILED);
    expect(error.recoverable).toBe(true);
    expect(error.suggestions.some(s => s.includes('without webcrack'))).toBe(true);
  });

  it('should create BabelTransformError as recoverable', () => {
    const error = new BabelTransformError('Syntax error');
    
    expect(error.code).toBe(ErrorCode.BABEL_TRANSFORM_FAILED);
    expect(error.recoverable).toBe(true);
  });

  it('should create PrettierError as recoverable', () => {
    const error = new PrettierError('Formatting failed');
    
    expect(error.code).toBe(ErrorCode.PRETTIER_FAILED);
    expect(error.recoverable).toBe(true);
  });
});

describe('ErrorRecoveryManager', () => {
  it('should recover from webcrack errors', async () => {
    const manager = new ErrorRecoveryManager();
    const error = new WebcrackError('Webcrack failed');
    const context = { code: 'original code' };

    const result = await manager.attemptRecovery(error, context);
    expect(result).toEqual({ code: 'original code' });
  });

  it('should recover from babel errors', async () => {
    const manager = new ErrorRecoveryManager();
    const error = new BabelTransformError('Babel failed');
    const context = { code: 'original code' };

    const result = await manager.attemptRecovery(error, context);
    expect(result).toEqual({ code: 'original code' });
  });

  it('should recover from prettier errors', async () => {
    const manager = new ErrorRecoveryManager();
    const error = new PrettierError('Prettier failed');
    const context = { code: 'original code' };

    const result = await manager.attemptRecovery(error, context);
    expect(result).toEqual({ code: 'original code' });
  });

  it('should throw error if no recovery possible', async () => {
    const manager = new ErrorRecoveryManager();
    const error = new FileNotFoundError('/nonexistent.js');
    const context = { code: 'code' };

    await expect(manager.attemptRecovery(error, context)).rejects.toThrow(error);
  });
});

describe('Utility Functions', () => {
  it('should identify recoverable errors', () => {
    const recoverableError = new WebcrackError('Failed');
    const nonRecoverableError = new FileNotFoundError('/test.js');

    expect(isRecoverableError(recoverableError)).toBe(true);
    expect(isRecoverableError(nonRecoverableError)).toBe(false);
    expect(isRecoverableError(new Error('Generic'))).toBe(false);
  });

  it('should format error messages correctly', () => {
    const error = {
      code: ErrorCode.FILE_NOT_FOUND,
      message: 'File not found',
      step: 'file-input',
      recoverable: true,
      suggestions: ['Check path', 'Try absolute path'],
    };

    const formatted = formatErrorMessage(error);
    expect(formatted).toContain('❌ Error in file-input: File not found');
    expect(formatted).toContain('💡 Suggestions:');
    expect(formatted).toContain('• Check path');
    expect(formatted).toContain('• Try absolute path');
    expect(formatted).toContain('🔄 This error is recoverable');
  });

  it('should calculate error metrics correctly', () => {
    const errors = [
      {
        code: ErrorCode.WEBCRACK_FAILED,
        message: 'Error 1',
        step: 'webcrack',
        recoverable: true,
      },
      {
        code: ErrorCode.WEBCRACK_FAILED,
        message: 'Error 2',
        step: 'webcrack',
        recoverable: true,
      },
      {
        code: ErrorCode.FILE_NOT_FOUND,
        message: 'Error 3',
        step: 'file-input',
        recoverable: false,
      },
    ];

    const metrics = getErrorMetrics(errors);
    expect(metrics.total).toBe(3);
    expect(metrics.recoverable).toBe(2);
    expect(metrics.byStep.webcrack).toBe(2);
    expect(metrics.byStep['file-input']).toBe(1);
    expect(metrics.byCode[ErrorCode.WEBCRACK_FAILED]).toBe(2);
    expect(metrics.byCode[ErrorCode.FILE_NOT_FOUND]).toBe(1);
  });
});