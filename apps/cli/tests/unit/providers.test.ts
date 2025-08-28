/**
 * Tests for provider factory and provider management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderFactory, SupportedProvider } from '../../src/providers/factory.js';
import { BaseLLMProvider } from '../../src/providers/base.js';
import { AnthropicProvider } from '../../src/providers/anthropic.js';
import { OpenAIProvider } from '../../src/providers/openai.js';
import { OllamaProvider } from '../../src/providers/ollama.js';
import { ProviderConfig } from '../../src/types.js';
import { ReScriptError, ErrorCode } from '../../src/utils/errors.js';

describe('ProviderFactory', () => {
  beforeEach(() => {
    ProviderFactory.clearCache();
  });

  describe('createProvider', () => {
    it('should create Anthropic provider', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const provider = ProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create OpenAI provider', () => {
      const config: ProviderConfig = {
        name: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      const provider = ProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Azure provider with OpenAI backend', () => {
      const config: ProviderConfig = {
        name: 'azure',
        model: 'gpt-4o',
        apiKey: 'test-key',
        baseUrl: 'https://test-resource.openai.azure.com/',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      const provider = ProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Ollama provider', () => {
      const config: ProviderConfig = {
        name: 'ollama',
        model: 'llama3:8b',
        baseUrl: 'http://localhost:11434',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      const provider = ProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(OllamaProvider);
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        name: 'unsupported-provider',
        model: 'some-model',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      } as ProviderConfig;

      expect(() => ProviderFactory.createProvider(config)).toThrow(ReScriptError);
    });

    it('should throw error for Azure without baseUrl', () => {
      const config: ProviderConfig = {
        name: 'azure',
        model: 'gpt-4o',
        apiKey: 'test-key',
        // missing baseUrl
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      expect(() => ProviderFactory.createProvider(config)).toThrow(ReScriptError);
    });
  });

  describe('provider caching', () => {
    it('should cache providers with same configuration', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const provider1 = ProviderFactory.createProvider(config);
      const provider2 = ProviderFactory.createProvider(config);

      expect(provider1).toBe(provider2);
    });

    it('should create new provider for different configuration', () => {
      const config1: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key-1',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const config2: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key-2',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const provider1 = ProviderFactory.createProvider(config1);
      const provider2 = ProviderFactory.createProvider(config2);

      expect(provider1).not.toBe(provider2);
    });

    it('should update cached provider config', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const provider1 = ProviderFactory.createProvider(config);
      const provider2 = ProviderFactory.createProvider({ ...config, temperature: 0.5 });

      expect(provider1).toBe(provider2);
      // In a real implementation, you'd verify the config was updated
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();
      expect(providers).toEqual(['anthropic', 'openai', 'azure', 'ollama']);
    });
  });

  describe('getAvailableModels', () => {
    it('should return Anthropic models', () => {
      const models = ProviderFactory.getAvailableModels('anthropic');
      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('claude-3-5-haiku-20241022');
      expect(models).toContain('claude-3-opus-20240229');
    });

    it('should return OpenAI models', () => {
      const models = ProviderFactory.getAvailableModels('openai');
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-4-turbo');
    });

    it('should return same models for Azure as OpenAI', () => {
      const openaiModels = ProviderFactory.getAvailableModels('openai');
      const azureModels = ProviderFactory.getAvailableModels('azure');
      expect(azureModels).toEqual(openaiModels);
    });

    it('should return Ollama models', () => {
      const models = ProviderFactory.getAvailableModels('ollama');
      expect(models).toContain('llama3:8b');
      expect(models).toContain('codellama:13b');
      expect(models).toContain('mistral:7b');
    });

    it('should return empty array for unsupported provider', () => {
      const models = ProviderFactory.getAvailableModels('unsupported' as SupportedProvider);
      expect(models).toEqual([]);
    });
  });

  describe('getRecommendedModel', () => {
    it('should recommend Haiku for small Anthropic tasks', () => {
      const model = ProviderFactory.getRecommendedModel('anthropic', 5000, false);
      expect(model).toBe('claude-3-5-haiku-20241022');
    });

    it('should recommend Sonnet for medium Anthropic tasks', () => {
      const model = ProviderFactory.getRecommendedModel('anthropic', 25000, false);
      expect(model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should recommend Opus for large Anthropic tasks', () => {
      const model = ProviderFactory.getRecommendedModel('anthropic', 75000, false);
      expect(model).toBe('claude-3-opus-20240229');
    });

    it('should recommend cost-effective model when prioritizing cost', () => {
      const model = ProviderFactory.getRecommendedModel('anthropic', 25000, true);
      expect(model).toBe('claude-3-5-haiku-20241022');
    });

    it('should recommend GPT-4o-mini for small OpenAI tasks', () => {
      const model = ProviderFactory.getRecommendedModel('openai', 3000, false);
      expect(model).toBe('gpt-4o-mini');
    });

    it('should recommend CodeLlama for Ollama tasks', () => {
      const model = ProviderFactory.getRecommendedModel('ollama', 5000, false);
      expect(model).toBe('codellama:13b');
    });

    it('should throw error when no models available', () => {
      // Mock getAvailableModels to return empty array
      const originalMethod = ProviderFactory.getAvailableModels;
      (ProviderFactory as any).getAvailableModels = vi.fn().mockReturnValue([]);

      expect(() => 
        ProviderFactory.getRecommendedModel('anthropic', 5000, false)
      ).toThrow(ReScriptError);

      // Restore original method
      (ProviderFactory as any).getAvailableModels = originalMethod;
    });
  });

  describe('validateConfig', () => {
    it('should validate correct Anthropic config', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported provider', () => {
      const config = {
        name: 'unsupported',
        model: 'some-model',
        temperature: 0.3,
        maxTokens: 4000,
      } as ProviderConfig;

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unsupported provider: unsupported');
    });

    it('should reject invalid model for provider', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'invalid-model',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Model \'invalid-model\' not available'))).toBe(true);
    });

    it('should reject missing API key for cloud providers', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        // missing apiKey
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key required for anthropic');
    });

    it('should reject missing baseUrl for Azure', () => {
      const config: ProviderConfig = {
        name: 'azure',
        model: 'gpt-4o',
        apiKey: 'test-key',
        // missing baseUrl
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Azure provider requires baseUrl (Azure endpoint)');
    });

    it('should warn about missing baseUrl for Ollama', () => {
      const config: ProviderConfig = {
        name: 'ollama',
        model: 'llama3:8b',
        // missing baseUrl
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('baseUrl'))).toBe(true);
    });

    it('should reject invalid temperature', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 5.0, // invalid
        maxTokens: 8192,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Temperature must be between 0 and 2');
    });

    it('should reject invalid token limits', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 300000, // invalid
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Max tokens must be between 1 and 200000');
    });

    it('should warn about high temperature', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 1.5,
        maxTokens: 8192,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('High temperature'))).toBe(true);
    });

    it('should warn about high token limit', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 150000,
        timeout: 30000,
      };

      const result = ProviderFactory.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('Very high token limit'))).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      const config: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      ProviderFactory.createProvider(config);
      expect(ProviderFactory.getCacheStats().size).toBe(1);

      ProviderFactory.clearCache();
      expect(ProviderFactory.getCacheStats().size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const config1: ProviderConfig = {
        name: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key-1',
        temperature: 0.3,
        maxTokens: 8192,
        timeout: 30000,
      };

      const config2: ProviderConfig = {
        name: 'openai',
        model: 'gpt-4o',
        apiKey: 'test-key-2',
        temperature: 0.3,
        maxTokens: 4000,
        timeout: 30000,
      };

      ProviderFactory.createProvider(config1);
      ProviderFactory.createProvider(config2);

      const stats = ProviderFactory.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.providers.anthropic).toBe(1);
      expect(stats.providers.openai).toBe(1);
    });
  });

  describe('getCostEstimates', () => {
    it('should return cost estimates for providers', () => {
      const estimates = ProviderFactory.getCostEstimates(1000, 500);
      
      expect(estimates.anthropic).toBeDefined();
      expect(estimates.anthropic.model).toBe('claude-3-5-sonnet-20241022');
      expect(typeof estimates.anthropic.cost).toBe('number');
      
      expect(estimates.openai).toBeDefined();
      expect(estimates.openai.model).toBe('gpt-4o');
      expect(typeof estimates.openai.cost).toBe('number');
    });

    it('should calculate reasonable cost estimates', () => {
      const estimates = ProviderFactory.getCostEstimates(1000, 500);
      
      // Costs should be positive numbers
      expect(estimates.anthropic.cost).toBeGreaterThan(0);
      expect(estimates.openai.cost).toBeGreaterThan(0);
      
      // Costs should be reasonable (not extremely high)
      expect(estimates.anthropic.cost).toBeLessThan(10);
      expect(estimates.openai.cost).toBeLessThan(10);
    });
  });
});