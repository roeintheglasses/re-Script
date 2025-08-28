/**
 * Validation utilities for re-script
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateJobId(jobId: string): ValidationResult;
export declare function validateFileExtension(filename: string, allowedExtensions: string[]): ValidationResult;
export declare function validateApiKey(apiKey: string | undefined, provider: string): ValidationResult;
export declare function validateFileSize(size: number, maxSize: number): ValidationResult;
export declare function validateRequired<T>(value: T | undefined | null, fieldName: string): T;
export declare function validateString(value: unknown, fieldName: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
}): string;
export declare function validateNumber(value: unknown, fieldName: string, options?: {
    min?: number;
    max?: number;
    integer?: boolean;
}): number;
export declare function validateArray<T>(value: unknown, fieldName: string, options?: {
    minLength?: number;
    maxLength?: number;
    validator?: (item: unknown, index: number) => T;
}): T[];
//# sourceMappingURL=validation.d.ts.map