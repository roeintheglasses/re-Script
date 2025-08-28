/**
 * Comprehensive error handling utilities for re-Script
 */
export var ErrorCode;
(function (ErrorCode) {
    // Input/Output Errors
    ErrorCode["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    ErrorCode["FILE_READ_ERROR"] = "FILE_READ_ERROR";
    ErrorCode["FILE_WRITE_ERROR"] = "FILE_WRITE_ERROR";
    ErrorCode["INVALID_FILE_FORMAT"] = "INVALID_FILE_FORMAT";
    // Configuration Errors
    ErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    ErrorCode["MISSING_API_KEY"] = "MISSING_API_KEY";
    ErrorCode["INVALID_MODEL"] = "INVALID_MODEL";
    // Processing Errors
    ErrorCode["WEBCRACK_FAILED"] = "WEBCRACK_FAILED";
    ErrorCode["BABEL_TRANSFORM_FAILED"] = "BABEL_TRANSFORM_FAILED";
    ErrorCode["PRETTIER_FAILED"] = "PRETTIER_FAILED";
    ErrorCode["CHUNKING_FAILED"] = "CHUNKING_FAILED";
    // LLM Errors
    ErrorCode["LLM_REQUEST_FAILED"] = "LLM_REQUEST_FAILED";
    ErrorCode["LLM_TIMEOUT"] = "LLM_TIMEOUT";
    ErrorCode["LLM_RATE_LIMITED"] = "LLM_RATE_LIMITED";
    ErrorCode["LLM_QUOTA_EXCEEDED"] = "LLM_QUOTA_EXCEEDED";
    ErrorCode["LLM_INVALID_RESPONSE"] = "LLM_INVALID_RESPONSE";
    // Cache Errors
    ErrorCode["CACHE_ERROR"] = "CACHE_ERROR";
    // API Errors
    ErrorCode["API_ERROR"] = "API_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    // Job Management Errors
    ErrorCode["JOB_NOT_FOUND"] = "JOB_NOT_FOUND";
    ErrorCode["JOB_CANCELLED"] = "JOB_CANCELLED";
    ErrorCode["JOB_TIMEOUT"] = "JOB_TIMEOUT";
    // Unknown/Generic Errors
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorCode || (ErrorCode = {}));
export class ReScriptError extends Error {
    code;
    step;
    recoverable;
    suggestions;
    originalError;
    constructor(code, message, step, recoverable = false, suggestions = [], originalError) {
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
    toProcessingError() {
        return {
            code: this.code,
            message: this.message,
            stack: this.stack,
            step: this.step,
            recoverable: this.recoverable,
            suggestions: this.suggestions,
        };
    }
    static fromError(error, step) {
        if (error instanceof ReScriptError) {
            return error;
        }
        if (error instanceof Error) {
            return new ReScriptError(ErrorCode.UNKNOWN_ERROR, error.message, step, false, [], error);
        }
        return new ReScriptError(ErrorCode.UNKNOWN_ERROR, String(error), step, false, []);
    }
}
// Specific error classes
export class FileNotFoundError extends ReScriptError {
    constructor(filePath, step = 'file-input') {
        super(ErrorCode.FILE_NOT_FOUND, `File not found: ${filePath}`, step, false, [
            'Check if the file path is correct',
            'Ensure the file exists and is readable',
            'Try using an absolute path',
        ]);
    }
}
export class InvalidConfigError extends ReScriptError {
    constructor(message, suggestions = []) {
        super(ErrorCode.INVALID_CONFIG, `Configuration error: ${message}`, 'config-validation', false, [
            'Check your configuration file syntax',
            'Validate against the schema',
            ...suggestions,
        ]);
    }
}
export class MissingApiKeyError extends ReScriptError {
    constructor(provider) {
        super(ErrorCode.MISSING_API_KEY, `API key required for ${provider}`, 'provider-setup', false, [
            `Set the API key in your config file`,
            `Use environment variable for ${provider.toUpperCase()}_API_KEY`,
            'Check provider documentation for API key setup',
        ]);
    }
}
export class LLMRequestError extends ReScriptError {
    constructor(provider, message, recoverable = true, originalError) {
        const suggestions = [
            'Check your API key and quota',
            'Verify the model name is correct',
            'Try reducing the input size',
        ];
        if (recoverable) {
            suggestions.push('The request will be retried automatically');
        }
        super(ErrorCode.LLM_REQUEST_FAILED, `${provider} request failed: ${message}`, 'llm-processing', recoverable, suggestions, originalError);
    }
}
export class JobNotFoundError extends ReScriptError {
    constructor(jobId) {
        super(ErrorCode.JOB_NOT_FOUND, `Job not found: ${jobId}`, 'job-management', false, [
            'Check if the job ID is correct',
            'Job may have been deleted or expired',
        ]);
    }
}
export class ValidationError extends ReScriptError {
    constructor(message, field) {
        super(ErrorCode.VALIDATION_ERROR, field ? `Validation error for ${field}: ${message}` : `Validation error: ${message}`, 'validation', false, [
            'Check the input data format',
            'Ensure all required fields are provided',
        ]);
    }
}
export class WebcrackError extends ReScriptError {
    constructor(message, originalError) {
        super(ErrorCode.WEBCRACK_FAILED, `Webcrack processing failed: ${message}`, 'webcrack', true, [
            'The code may not be minified or obfuscated',
            'Try processing without webcrack step',
            'Check if the input is valid JavaScript',
        ], originalError);
    }
}
export class BabelTransformError extends ReScriptError {
    constructor(message, originalError) {
        super(ErrorCode.BABEL_TRANSFORM_FAILED, `Babel transformation failed: ${message}`, 'babel-transform', true, [
            'The code may have syntax errors',
            'Try skipping custom Babel transformations',
            'Check the input code validity',
        ], originalError);
    }
}
export class PrettierError extends ReScriptError {
    constructor(message, originalError) {
        super(ErrorCode.PRETTIER_FAILED, `Code formatting failed: ${message}`, 'prettier', true, [
            'The code may have syntax errors',
            'Try different prettier parser options',
            'Skip formatting step if necessary',
        ], originalError);
    }
}
export class WebcrackRecovery {
    canRecover(error) {
        return error.code === ErrorCode.WEBCRACK_FAILED;
    }
    async recover(error, context) {
        console.warn('Webcrack failed, skipping deobfuscation step');
        return { code: context.code };
    }
}
export class BabelRecovery {
    canRecover(error) {
        return error.code === ErrorCode.BABEL_TRANSFORM_FAILED;
    }
    async recover(error, context) {
        console.warn('Babel transformation failed, skipping AST transformations');
        return { code: context.code };
    }
}
export class PrettierRecovery {
    canRecover(error) {
        return error.code === ErrorCode.PRETTIER_FAILED;
    }
    async recover(error, context) {
        console.warn('Prettier formatting failed, returning unformatted code');
        return { code: context.code };
    }
}
// Error recovery manager
export class ErrorRecoveryManager {
    strategies = [
        new WebcrackRecovery(),
        new BabelRecovery(),
        new PrettierRecovery(),
    ];
    async attemptRecovery(error, context) {
        for (const strategy of this.strategies) {
            if (strategy.canRecover(error)) {
                try {
                    return await strategy.recover(error, context);
                }
                catch (recoveryError) {
                    console.warn(`Recovery strategy failed: ${recoveryError}`);
                }
            }
        }
        throw error; // No recovery possible
    }
    addStrategy(strategy) {
        this.strategies.push(strategy);
    }
}
// Utility functions for error handling
export function isRecoverableError(error) {
    return error instanceof ReScriptError && error.recoverable;
}
export function formatErrorMessage(error) {
    const lines = [
        `❌ Error in ${error.step}: ${error.message}`,
    ];
    if (error.suggestions && error.suggestions.length > 0) {
        lines.push('');
        lines.push('💡 Suggestions:');
        error.suggestions.forEach((suggestion) => {
            lines.push(`  • ${suggestion}`);
        });
    }
    if (error.recoverable) {
        lines.push('');
        lines.push('🔄 This error is recoverable - attempting to continue...');
    }
    return lines.join('\n');
}
export function getErrorMetrics(errors) {
    const metrics = {
        total: errors.length,
        recoverable: 0,
        byStep: {},
        byCode: {},
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
