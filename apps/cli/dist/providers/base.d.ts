/**
 * Base LLM provider interface and utilities
 */
import { LLMProvider, LLMRequest, LLMResponse, RenameSuggestion, ProviderConfig } from '../types.js';
/**
 * Abstract base class for all LLM providers
 */
export declare abstract class BaseLLMProvider implements LLMProvider {
    abstract readonly name: string;
    abstract readonly models: string[];
    abstract readonly maxTokens: number;
    abstract readonly supportsStreaming: boolean;
    abstract readonly supportsFunctionCalling: boolean;
    protected config: ProviderConfig;
    protected requestCount: number;
    protected totalTokensUsed: number;
    constructor(config: ProviderConfig);
    /**
     * Process code and return rename suggestions
     */
    abstract processCode(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Validate provider configuration
     */
    protected validateConfig(): void;
    /**
     * Whether this provider requires an API key
     */
    protected requiresApiKey(): boolean;
    /**
     * Create standardized system prompt
     */
    protected createSystemPrompt(): string;
    /**
     * Create user prompt for code analysis
     */
    protected createUserPrompt(code: string): string;
    /**
     * Estimate code complexity for better prompting
     */
    protected estimateComplexity(code: string): string;
    /**
     * Handle API request with retries and error handling
     */
    protected executeWithRetry<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
    /**
     * Check if error should not be retried
     */
    protected isNonRetryableError(error: unknown): boolean;
    /**
     * Sleep utility for delays
     */
    protected sleep(ms: number): Promise<void>;
    /**
     * Parse and validate rename suggestions from LLM response
     */
    protected parseRenameSuggestions(response: unknown): RenameSuggestion[];
    /**
     * Validate string field
     */
    private validateString;
    /**
     * Validate number field with range
     */
    private validateNumber;
    /**
     * Validate and normalize type field
     */
    private validateType;
    /**
     * Calculate overall confidence score for response
     */
    protected calculateOverallConfidence(suggestions: RenameSuggestion[]): number;
    /**
     * Get provider statistics
     */
    getStatistics(): {
        requestCount: number;
        totalTokensUsed: number;
        averageTokensPerRequest: number;
    };
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ProviderConfig>): void;
}
//# sourceMappingURL=base.d.ts.map