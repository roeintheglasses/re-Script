/**
 * Anthropic Claude provider implementation
 */
import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
export declare class AnthropicProvider extends BaseLLMProvider {
    readonly name = "anthropic";
    readonly models: string[];
    private availableModels;
    private modelsLoaded;
    readonly maxTokens = 200000;
    readonly supportsStreaming = true;
    readonly supportsFunctionCalling = true;
    private client;
    constructor(config: ProviderConfig);
    /**
     * Process code using Claude
     */
    processCode(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Create enhanced user prompt for Claude
     */
    protected createUserPrompt(code: string): string;
    /**
     * Check if Anthropic error is retryable
     */
    private isRetryableAnthropicError;
    /**
     * Get model-specific token limits
     */
    getModelTokenLimit(model: string): number;
    /**
     * Get recommended model for code size
     */
    getRecommendedModel(codeSize: number): string;
    /**
     * Estimate cost for request
     */
    estimateCost(inputTokens: number, outputTokens: number, model: string): number;
    /**
     * Load available models from Anthropic
     * Note: Anthropic doesn't have a public models API, so we use a curated list
     */
    loadAvailableModels(): Promise<string[]>;
    /**
     * Get available models (public interface)
     */
    getAvailableModels(): Promise<string[]>;
}
import type { ProviderConfig } from '../types.js';
//# sourceMappingURL=anthropic.d.ts.map