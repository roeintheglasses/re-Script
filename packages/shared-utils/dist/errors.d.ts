/**
 * Comprehensive error handling utilities for re-Script
 */
import { ProcessingError } from '@re-script/shared-types';
export declare enum ErrorCode {
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    FILE_READ_ERROR = "FILE_READ_ERROR",
    FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
    INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT",
    INVALID_CONFIG = "INVALID_CONFIG",
    MISSING_API_KEY = "MISSING_API_KEY",
    INVALID_MODEL = "INVALID_MODEL",
    WEBCRACK_FAILED = "WEBCRACK_FAILED",
    BABEL_TRANSFORM_FAILED = "BABEL_TRANSFORM_FAILED",
    PRETTIER_FAILED = "PRETTIER_FAILED",
    CHUNKING_FAILED = "CHUNKING_FAILED",
    LLM_REQUEST_FAILED = "LLM_REQUEST_FAILED",
    LLM_TIMEOUT = "LLM_TIMEOUT",
    LLM_RATE_LIMITED = "LLM_RATE_LIMITED",
    LLM_QUOTA_EXCEEDED = "LLM_QUOTA_EXCEEDED",
    LLM_INVALID_RESPONSE = "LLM_INVALID_RESPONSE",
    CACHE_ERROR = "CACHE_ERROR",
    API_ERROR = "API_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    JOB_NOT_FOUND = "JOB_NOT_FOUND",
    JOB_CANCELLED = "JOB_CANCELLED",
    JOB_TIMEOUT = "JOB_TIMEOUT",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export declare class ReScriptError extends Error {
    readonly code: ErrorCode;
    readonly step: string;
    readonly recoverable: boolean;
    readonly suggestions: string[];
    readonly originalError?: Error;
    constructor(code: ErrorCode, message: string, step: string, recoverable?: boolean, suggestions?: string[], originalError?: Error);
    toProcessingError(): ProcessingError;
    static fromError(error: unknown, step: string): ReScriptError;
}
export declare class FileNotFoundError extends ReScriptError {
    constructor(filePath: string, step?: string);
}
export declare class InvalidConfigError extends ReScriptError {
    constructor(message: string, suggestions?: string[]);
}
export declare class MissingApiKeyError extends ReScriptError {
    constructor(provider: string);
}
export declare class LLMRequestError extends ReScriptError {
    constructor(provider: string, message: string, recoverable?: boolean, originalError?: Error);
}
export declare class JobNotFoundError extends ReScriptError {
    constructor(jobId: string);
}
export declare class ValidationError extends ReScriptError {
    constructor(message: string, field?: string);
}
export declare class WebcrackError extends ReScriptError {
    constructor(message: string, originalError?: Error);
}
export declare class BabelTransformError extends ReScriptError {
    constructor(message: string, originalError?: Error);
}
export declare class PrettierError extends ReScriptError {
    constructor(message: string, originalError?: Error);
}
export interface RecoveryStrategy {
    canRecover(error: ReScriptError): boolean;
    recover(error: ReScriptError, context: unknown): Promise<unknown>;
}
export declare class WebcrackRecovery implements RecoveryStrategy {
    canRecover(error: ReScriptError): boolean;
    recover(error: ReScriptError, context: {
        code: string;
    }): Promise<{
        code: string;
    }>;
}
export declare class BabelRecovery implements RecoveryStrategy {
    canRecover(error: ReScriptError): boolean;
    recover(error: ReScriptError, context: {
        code: string;
    }): Promise<{
        code: string;
    }>;
}
export declare class PrettierRecovery implements RecoveryStrategy {
    canRecover(error: ReScriptError): boolean;
    recover(error: ReScriptError, context: {
        code: string;
    }): Promise<{
        code: string;
    }>;
}
export declare class ErrorRecoveryManager {
    private strategies;
    attemptRecovery(error: ReScriptError, context: unknown): Promise<unknown>;
    addStrategy(strategy: RecoveryStrategy): void;
}
export declare function isRecoverableError(error: unknown): boolean;
export declare function formatErrorMessage(error: ProcessingError): string;
export declare function getErrorMetrics(errors: ProcessingError[]): {
    total: number;
    recoverable: number;
    byStep: Record<string, number>;
    byCode: Record<string, number>;
};
//# sourceMappingURL=errors.d.ts.map