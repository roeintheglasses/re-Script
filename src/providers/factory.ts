/**
 * Provider factory for creating and managing LLM providers
 */

import { BaseLLMProvider } from './base.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { ProviderConfig } from '../types.js';
import { ReScriptError, ErrorCode } from '../utils/errors.js';

export type SupportedProvider = 'anthropic' | 'openai' | 'azure' | 'ollama';

/**
 * Factory class for creating LLM providers
 */
export class ProviderFactory {
  private static providerCache = new Map<string, BaseLLMProvider>();

  /**
   * Create a provider instance
   */
  static createProvider(config: ProviderConfig): BaseLLMProvider {
    // Create cache key from config
    const cacheKey = this.createCacheKey(config);
    
    // Return cached provider if available
    const cachedProvider = this.providerCache.get(cacheKey);
    if (cachedProvider) {
      // Update config in case it changed
      cachedProvider.updateConfig(config);
      return cachedProvider;
    }

    // Create new provider
    let provider: BaseLLMProvider;

    switch (config.name) {
      case 'anthropic':
        provider = new AnthropicProvider(config);
        break;

      case 'openai':
        provider = new OpenAIProvider(config);
        break;

      case 'azure':
        // Azure uses OpenAI provider with specific configuration
        if (!config.baseUrl) {
          throw new ReScriptError(
            ErrorCode.INVALID_CONFIG,
            'Azure provider requires baseUrl (Azure endpoint)',
            'provider-setup',
            false,
            ['Set baseUrl to your Azure OpenAI endpoint', 'Example: https://your-resource.openai.azure.com/']
          );
        }
        provider = new OpenAIProvider({
          ...config,
          name: 'openai', // Use OpenAI provider internally
        });
        break;

      case 'ollama':
        provider = new OllamaProvider(config);
        break;

      default:
        throw new ReScriptError(
          ErrorCode.INVALID_CONFIG,
          `Unsupported provider: ${config.name}`,
          'provider-setup',
          false,
          [`Supported providers: ${this.getSupportedProviders().join(', ')}`]
        );
    }

    // Cache the provider
    this.providerCache.set(cacheKey, provider);
    
    return provider;
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): SupportedProvider[] {
    return ['anthropic', 'openai', 'azure', 'ollama'];
  }

  /**
   * Get available models for a provider
   */
  static getAvailableModels(providerName: SupportedProvider): string[] {
    switch (providerName) {
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];

      case 'openai':
      case 'azure':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo'
        ];

      case 'ollama':
        // These would be dynamically fetched from Ollama API
        return [
          'llama3:8b',
          'llama3:70b',
          'codellama:13b',
          'codellama:34b',
          'mistral:7b',
          'deepseek-coder:6.7b'
        ];

      default:
        return [];
    }
  }

  /**
   * Get recommended model for provider and use case
   */
  static getRecommendedModel(
    providerName: SupportedProvider,
    codeSize: number,
    prioritizeCost = false
  ): string {
    const models = this.getAvailableModels(providerName);
    
    if (models.length === 0) {
      throw new ReScriptError(
        ErrorCode.INVALID_MODEL,
        `No models available for provider: ${providerName}`,
        'provider-setup'
      );
    }

    switch (providerName) {
      case 'anthropic':
        if (prioritizeCost || codeSize < 10000) {
          return 'claude-3-5-haiku-20241022';
        } else if (codeSize < 50000) {
          return 'claude-3-5-sonnet-20241022';
        } else {
          return 'claude-3-opus-20240229';
        }

      case 'openai':
      case 'azure':
        if (prioritizeCost || codeSize < 5000) {
          return 'gpt-4o-mini';
        } else if (codeSize < 20000) {
          return 'gpt-4o';
        } else {
          return 'gpt-4-turbo';
        }

      case 'ollama':
        if (codeSize < 10000) {
          return 'codellama:13b';
        } else {
          return 'codellama:34b';
        }

      default:
        return models[0]!;
    }
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: ProviderConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Check provider name
    if (!this.getSupportedProviders().includes(config.name as SupportedProvider)) {
      result.valid = false;
      result.errors.push(`Unsupported provider: ${config.name}`);
    }

    // Check model availability
    const availableModels = this.getAvailableModels(config.name as SupportedProvider);
    if (availableModels.length > 0 && !availableModels.includes(config.model)) {
      result.valid = false;
      result.errors.push(`Model '${config.model}' not available for ${config.name}`);
    }

    // Check API key for cloud providers
    if (['anthropic', 'openai', 'azure'].includes(config.name) && !config.apiKey) {
      result.valid = false;
      result.errors.push(`API key required for ${config.name}`);
    }

    // Check Azure-specific requirements
    if (config.name === 'azure' && !config.baseUrl) {
      result.valid = false;
      result.errors.push('Azure provider requires baseUrl (Azure endpoint)');
    }

    // Check Ollama-specific requirements
    if (config.name === 'ollama' && !config.baseUrl) {
      result.warnings.push('Ollama provider should specify baseUrl (defaults to http://localhost:11434)');
    }

    // Validate temperature range
    if (config.temperature < 0 || config.temperature > 2) {
      result.valid = false;
      result.errors.push('Temperature must be between 0 and 2');
    }

    // Validate token limits
    if (config.maxTokens < 1 || config.maxTokens > 200000) {
      result.valid = false;
      result.errors.push('Max tokens must be between 1 and 200000');
    }

    // Warnings for suboptimal configurations
    if (config.temperature > 1.0) {
      result.warnings.push('High temperature (>1.0) may produce inconsistent results');
    }

    if (config.maxTokens > 100000) {
      result.warnings.push('Very high token limit may increase costs significantly');
    }

    return result;
  }

  /**
   * Get cost estimates for different providers
   */
  static getCostEstimates(
    inputTokens: number,
    outputTokens: number
  ): Record<string, { model: string; cost: number }> {
    const estimates: Record<string, { model: string; cost: number }> = {};

    // Anthropic estimates
    const anthropicProvider = new AnthropicProvider({
      name: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: 'dummy',
      temperature: 0.3,
      maxTokens: 8192,
      timeout: 30000,
    });

    estimates.anthropic = {
      model: 'claude-3-5-sonnet-20241022',
      cost: anthropicProvider.estimateCost(inputTokens, outputTokens, 'claude-3-5-sonnet-20241022'),
    };

    // OpenAI estimates
    const openaiProvider = new OpenAIProvider({
      name: 'openai',
      model: 'gpt-4o',
      apiKey: 'dummy',
      temperature: 0.3,
      maxTokens: 8192,
      timeout: 30000,
    });

    estimates.openai = {
      model: 'gpt-4o',
      cost: openaiProvider.estimateCost(inputTokens, outputTokens, 'gpt-4o'),
    };

    return estimates;
  }

  /**
   * Create cache key for provider caching
   */
  private static createCacheKey(config: ProviderConfig): string {
    return `${config.name}-${config.model}-${config.apiKey?.substring(0, 8) || 'none'}`;
  }

  /**
   * Clear provider cache
   */
  static clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    providers: Record<string, number>;
  } {
    const stats = {
      size: this.providerCache.size,
      providers: {} as Record<string, number>,
    };

    for (const [key] of this.providerCache) {
      const providerName = key.split('-')[0]!;
      stats.providers[providerName] = (stats.providers[providerName] || 0) + 1;
    }

    return stats;
  }
}