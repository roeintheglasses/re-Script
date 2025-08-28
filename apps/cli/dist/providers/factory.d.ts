/**
 * Provider factory for creating and managing LLM providers
 */
import { BaseLLMProvider } from './base.js';
import { ProviderConfig } from '../types.js';
export type SupportedProvider = 'anthropic' | 'openai' | 'azure' | 'ollama';
/**
 * Factory class for creating LLM providers
 */
export declare class ProviderFactory {
    private static providerCache;
    /**
     * Create a provider instance
     */
    static createProvider(config: ProviderConfig): BaseLLMProvider;
    /**
     * Get list of supported providers
     */
    static getSupportedProviders(): SupportedProvider[];
    /**
     * Get available models for a provider
     */
    static getAvailableModels(providerName: SupportedProvider): string[];
    /**
     * Get recommended model for provider and use case
     */
    static getRecommendedModel(providerName: SupportedProvider, codeSize: number, prioritizeCost?: boolean): string;
    /**
     * Validate provider configuration
     */
    static validateConfig(config: ProviderConfig): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Get cost estimates for different providers
     */
    static getCostEstimates(inputTokens: number, outputTokens: number): Record<string, {
        model: string;
        cost: number;
    }>;
    /**
     * Create cache key for provider caching
     */
    private static createCacheKey;
    /**
     * Clear provider cache
     */
    static clearCache(): void;
    /**
     * Get cache statistics
     */
    static getCacheStats(): {
        size: number;
        providers: Record<string, number>;
    };
}
//# sourceMappingURL=factory.d.ts.map