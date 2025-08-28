/**
 * Ollama provider implementation for local models
 */
import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
interface OllamaModelInfo {
    name: string;
    size: number;
    digest: string;
    details: {
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}
export declare class OllamaProvider extends BaseLLMProvider {
    readonly name = "ollama";
    readonly models: string[];
    readonly maxTokens = 32768;
    readonly supportsStreaming = true;
    readonly supportsFunctionCalling = false;
    private baseUrl;
    private availableModels;
    private modelsLoaded;
    constructor(config: ProviderConfig);
    /**
     * Check if API key is required (Ollama typically doesn't need one)
     */
    protected requiresApiKey(): boolean;
    /**
     * Process code using Ollama
     */
    processCode(request: LLMRequest): Promise<LLMResponse>;
    /**
     * Create complete prompt for text-based models
     */
    private createCompletePrompt;
    /**
     * Generate completion using Ollama API
     */
    private generateCompletion;
    /**
     * Parse text response to extract rename suggestions
     */
    private parseTextResponse;
    /**
     * Fallback text parsing when JSON parsing fails
     */
    private parseTextFallback;
    /**
     * Ensure model is available locally
     */
    private ensureModelAvailable;
    /**
     * Load available models from Ollama
     */
    private loadAvailableModels;
    /**
     * Check Ollama server health
     */
    checkHealth(): Promise<{
        healthy: boolean;
        version?: string;
        models: number;
        error?: string;
    }>;
    /**
     * Get recommended models for different use cases
     */
    getRecommendedModels(): {
        speed: string[];
        quality: string[];
        coding: string[];
    };
    /**
     * Pull a model from Ollama registry
     */
    pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void>;
    /**
     * Get model information
     */
    getModelInfo(modelName: string): Promise<OllamaModelInfo | null>;
    /**
     * Estimate cost (Ollama is free, so return 0)
     */
    estimateCost(inputTokens: number, outputTokens: number, model: string): number;
    /**
     * Get model token limit
     */
    getModelTokenLimit(model: string): number;
    /**
     * Get recommended model for code size
     */
    getRecommendedModel(codeSize: number): string;
    /**
     * Get available models (public interface)
     */
    getAvailableModels(): Promise<string[]>;
}
import type { ProviderConfig } from '../types.js';
export {};
//# sourceMappingURL=ollama.d.ts.map