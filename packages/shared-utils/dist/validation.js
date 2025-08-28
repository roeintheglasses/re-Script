/**
 * Validation utilities for re-script
 */
import { ValidationError } from './errors.js';
export function validateJobId(jobId) {
    const result = { valid: true, errors: [], warnings: [] };
    if (!jobId || typeof jobId !== 'string') {
        result.valid = false;
        result.errors.push('Job ID is required and must be a string');
    }
    else if (jobId.length < 1 || jobId.length > 100) {
        result.valid = false;
        result.errors.push('Job ID must be between 1 and 100 characters');
    }
    else if (!/^[a-zA-Z0-9-_]+$/.test(jobId)) {
        result.valid = false;
        result.errors.push('Job ID must contain only alphanumeric characters, hyphens, and underscores');
    }
    return result;
}
export function validateFileExtension(filename, allowedExtensions) {
    const result = { valid: true, errors: [], warnings: [] };
    if (!filename) {
        result.valid = false;
        result.errors.push('Filename is required');
        return result;
    }
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) {
        result.valid = false;
        result.errors.push('File must have an extension');
        return result;
    }
    if (!allowedExtensions.includes(`.${ext}`)) {
        result.valid = false;
        result.errors.push(`File extension .${ext} is not supported. Allowed: ${allowedExtensions.join(', ')}`);
    }
    return result;
}
export function validateApiKey(apiKey, provider) {
    const result = { valid: true, errors: [], warnings: [] };
    if (!apiKey) {
        result.valid = false;
        result.errors.push(`API key is required for ${provider}`);
        return result;
    }
    if (typeof apiKey !== 'string') {
        result.valid = false;
        result.errors.push('API key must be a string');
        return result;
    }
    if (apiKey.length < 10) {
        result.valid = false;
        result.errors.push('API key appears to be too short');
    }
    return result;
}
export function validateFileSize(size, maxSize) {
    const result = { valid: true, errors: [], warnings: [] };
    if (size > maxSize) {
        result.valid = false;
        result.errors.push(`File size ${formatBytes(size)} exceeds maximum allowed size ${formatBytes(maxSize)}`);
    }
    else if (size > maxSize * 0.8) {
        result.warnings.push(`File size ${formatBytes(size)} is approaching the limit`);
    }
    return result;
}
export function validateRequired(value, fieldName) {
    if (value === undefined || value === null) {
        throw new ValidationError(`${fieldName} is required`);
    }
    return value;
}
export function validateString(value, fieldName, options = {}) {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }
    if (options.minLength && value.length < options.minLength) {
        throw new ValidationError(`${fieldName} must be at least ${options.minLength} characters long`);
    }
    if (options.maxLength && value.length > options.maxLength) {
        throw new ValidationError(`${fieldName} must be at most ${options.maxLength} characters long`);
    }
    if (options.pattern && !options.pattern.test(value)) {
        throw new ValidationError(`${fieldName} does not match required pattern`);
    }
    return value;
}
export function validateNumber(value, fieldName, options = {}) {
    const num = Number(value);
    if (isNaN(num)) {
        throw new ValidationError(`${fieldName} must be a number`);
    }
    if (options.integer && !Number.isInteger(num)) {
        throw new ValidationError(`${fieldName} must be an integer`);
    }
    if (options.min !== undefined && num < options.min) {
        throw new ValidationError(`${fieldName} must be at least ${options.min}`);
    }
    if (options.max !== undefined && num > options.max) {
        throw new ValidationError(`${fieldName} must be at most ${options.max}`);
    }
    return num;
}
export function validateArray(value, fieldName, options = {}) {
    if (!Array.isArray(value)) {
        throw new ValidationError(`${fieldName} must be an array`);
    }
    if (options.minLength && value.length < options.minLength) {
        throw new ValidationError(`${fieldName} must have at least ${options.minLength} items`);
    }
    if (options.maxLength && value.length > options.maxLength) {
        throw new ValidationError(`${fieldName} must have at most ${options.maxLength} items`);
    }
    if (options.validator) {
        return value.map(options.validator);
    }
    return value;
}
// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
