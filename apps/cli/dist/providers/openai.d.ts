/**
 * OpenAI GPT provider implementation
 */
import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
export declare class OpenAIProvider extends BaseLLMProvider {
    readonly name = "openai";
    readonly models: string[];
    private availableModels;
    private modelsLoaded;
    readonly maxTokens = 128000;
    readonly supportsStreaming = true;
    readonly supportsFunctionCalling = true;
    private client;
    constructor(config: ProviderConfig);
    /**
     * Process code using OpenAI GPT
     */
    processCode(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Create enhanced user prompt for GPT
     */
    protected createUserPrompt(code: string): string;
    /**
     * Check if OpenAI error is retryable
     */
    private isRetryableOpenAIError;
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
     * Support for Azure OpenAI
     */
    static createAzureProvider(config: ProviderConfig & {
        azureEndpoint: string;
        azureDeployment: string;
        apiVersion?: string;
    }): OpenAIProvider;
    /**
     * Load available models from OpenAI API
     */
    loadAvailableModels(): Promise<string[]>;
    /**
     * Get available models (public interface)
     */
    getAvailableModels(): Promise<string[]>;
}
import type { ProviderConfig } from '../types.js';
//# sourceMappingURL=openai.d.ts.map