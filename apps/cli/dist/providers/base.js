/**
 * Base LLM provider interface and utilities
 */
import { ReScriptError, ErrorCode, LLMRequestError } from '../utils/errors.js';
/**
 * Abstract base class for all LLM providers
 */
export class BaseLLMProvider {
    config;
    requestCount = 0;
    totalTokensUsed = 0;
    constructor(config) {
        this.config = config;
        this.validateConfig();
    }
    /**
     * Validate provider configuration
     */
    validateConfig() {
        if (!this.config.apiKey && this.requiresApiKey()) {
            throw new ReScriptError(ErrorCode.MISSING_API_KEY, `API key required for ${this.name}`, 'provider-setup');
        }
        if (this.models && Array.isArray(this.models) && !this.models.includes(this.config.model)) {
            throw new ReScriptError(ErrorCode.INVALID_MODEL, `Model '${this.config.model}' not supported by ${this.name}. Available models: ${this.models.join(', ')}`, 'provider-setup', false, [`Use one of: ${this.models.join(', ')}`]);
        }
    }
    /**
     * Whether this provider requires an API key
     */
    requiresApiKey() {
        return true; // Override in local providers like Ollama
    }
    /**
     * Create standardized system prompt
     */
    createSystemPrompt() {
        return `You are a senior JavaScript developer specialized in code analysis and refactoring. 

Your task is to analyze minified/obfuscated JavaScript code and suggest meaningful variable and function names based on their usage context.

Guidelines:
1. Analyze the code structure and data flow
2. Suggest descriptive names that reflect the purpose/functionality
3. Use camelCase for variables and functions
4. Use PascalCase for classes and constructors
5. Avoid generic names like 'temp', 'data', 'obj' unless absolutely necessary
6. Consider the broader context when naming variables
7. For unclear purposes, use descriptive prefixes like 'unknown', 'temp', or 'util'

Respond with a structured list of rename suggestions including confidence scores.`;
    }
    /**
     * Create user prompt for code analysis
     */
    createUserPrompt(code) {
        const lines = code.split('\n').length;
        const chars = code.length;
        return `Analyze this JavaScript code and suggest meaningful variable/function names:

Code Statistics:
- Lines: ${lines}
- Characters: ${chars}
- Estimated complexity: ${this.estimateComplexity(code)}

Code to analyze:
\`\`\`javascript
${code}
\`\`\`

Please provide rename suggestions with confidence scores (0-1) and brief reasoning.`;
    }
    /**
     * Estimate code complexity for better prompting
     */
    estimateComplexity(code) {
        const functionCount = (code.match(/function/g) || []).length;
        const variableCount = (code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || []).length;
        const lines = code.split('\n').length;
        if (lines > 1000 || functionCount > 50)
            return 'high';
        if (lines > 300 || functionCount > 15)
            return 'medium';
        return 'low';
    }
    /**
     * Handle API request with retries and error handling
     */
    async executeWithRetry(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                this.requestCount++;
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    throw new LLMRequestError(this.name, lastError.message, false, lastError);
                }
                // Calculate delay with exponential backoff
                const delay = baseDelay * Math.pow(2, attempt - 1);
                const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
                if (attempt < maxRetries) {
                    console.warn(`⚠️  ${this.name} request failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);
                    console.warn(`   Retrying in ${Math.round(delay + jitter)}ms...`);
                    await this.sleep(delay + jitter);
                }
            }
        }
        throw new LLMRequestError(this.name, `Failed after ${maxRetries} attempts: ${lastError?.message}`, false, lastError);
    }
    /**
     * Check if error should not be retried
     */
    isNonRetryableError(error) {
        if (!(error instanceof Error))
            return false;
        const message = error.message.toLowerCase();
        // Authentication/authorization errors
        if (message.includes('unauthorized') ||
            message.includes('invalid api key') ||
            message.includes('forbidden')) {
            return true;
        }
        // Quota/billing errors
        if (message.includes('quota') ||
            message.includes('billing') ||
            message.includes('insufficient funds')) {
            return true;
        }
        // Invalid input errors
        if (message.includes('invalid input') ||
            message.includes('malformed') ||
            message.includes('bad request')) {
            return true;
        }
        return false;
    }
    /**
     * Sleep utility for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Parse and validate rename suggestions from LLM response
     */
    parseRenameSuggestions(response) {
        try {
            // Handle different response formats
            let suggestions;
            if (typeof response === 'string') {
                // Try to extract JSON from string response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    suggestions = JSON.parse(jsonMatch[0]);
                }
                else {
                    throw new Error('No JSON found in response');
                }
            }
            else {
                suggestions = response;
            }
            // Validate and normalize suggestions
            if (!Array.isArray(suggestions)) {
                if (typeof suggestions === 'object' && suggestions !== null) {
                    // Handle object with array property
                    const suggestionsObj = suggestions;
                    if (Array.isArray(suggestionsObj.suggestions)) {
                        suggestions = suggestionsObj.suggestions;
                    }
                    else if (Array.isArray(suggestionsObj.renames)) {
                        suggestions = suggestionsObj.renames;
                    }
                    else if (Array.isArray(suggestionsObj.variablesAndFunctionsToRename)) {
                        suggestions = suggestionsObj.variablesAndFunctionsToRename;
                    }
                    else {
                        throw new Error('Response does not contain a suggestions array');
                    }
                }
                else {
                    throw new Error('Response is not an array or object');
                }
            }
            return suggestions.map((item, index) => {
                if (typeof item !== 'object' || item === null) {
                    throw new Error(`Invalid suggestion at index ${index}`);
                }
                const suggestion = item;
                return {
                    originalName: this.validateString(suggestion.name || suggestion.originalName || suggestion.from, 'originalName'),
                    suggestedName: this.validateString(suggestion.newName || suggestion.suggestedName || suggestion.to, 'suggestedName'),
                    confidence: this.validateNumber(suggestion.confidence, 0.5, 0, 1),
                    reasoning: this.validateString(suggestion.reasoning || suggestion.reason, '', true),
                    type: this.validateType(suggestion.type),
                };
            });
        }
        catch (error) {
            throw new ReScriptError(ErrorCode.LLM_INVALID_RESPONSE, `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`, 'llm-processing', false, ['Check LLM response format', 'Try different model', 'Reduce input complexity']);
        }
    }
    /**
     * Validate string field
     */
    validateString(value, fieldName, optional = false) {
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
        if (optional && (value === undefined || value === null)) {
            return '';
        }
        throw new Error(`Invalid ${fieldName}: expected non-empty string`);
    }
    /**
     * Validate number field with range
     */
    validateNumber(value, defaultValue, min, max) {
        if (typeof value === 'number' && !isNaN(value)) {
            if (min !== undefined && value < min)
                return defaultValue;
            if (max !== undefined && value > max)
                return defaultValue;
            return value;
        }
        return defaultValue;
    }
    /**
     * Validate and normalize type field
     */
    validateType(value) {
        if (typeof value === 'string') {
            const normalized = value.toLowerCase();
            if (['variable', 'function', 'class', 'method', 'property'].includes(normalized)) {
                return normalized;
            }
        }
        return 'variable'; // Default fallback
    }
    /**
     * Calculate overall confidence score for response
     */
    calculateOverallConfidence(suggestions) {
        if (suggestions.length === 0)
            return 0;
        const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
        return totalConfidence / suggestions.length;
    }
    /**
     * Get provider statistics
     */
    getStatistics() {
        return {
            requestCount: this.requestCount,
            totalTokensUsed: this.totalTokensUsed,
            averageTokensPerRequest: this.requestCount > 0 ?
                Math.round(this.totalTokensUsed / this.requestCount) : 0,
        };
    }
    /**
     * Reset statistics
     */
    resetStatistics() {
        this.requestCount = 0;
        this.totalTokensUsed = 0;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.validateConfig();
    }
}
//# sourceMappingURL=base.js.map