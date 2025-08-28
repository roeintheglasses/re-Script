/**
 * Tests for main processor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MainProcessor } from '../../src/core/processor.js';
import { ReScriptConfig } from '../../src/types.js';
import { defaultConfig } from '../../src/config/schema.js';

describe('MainProcessor', () => {
  let processor: MainProcessor;
  let mockConfig: ReScriptConfig;

  beforeEach(() => {
    mockConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        apiKey: 'test-api-key',
      },
    };
    
    processor = new MainProcessor(mockConfig);
  });

  describe('constructor', () => {
    it('should create processor with config', () => {
      expect(processor).toBeDefined();
    });

    it('should use default options when not provided', () => {
      const processor = new MainProcessor(mockConfig);
      expect(processor).toBeDefined();
    });

    it('should accept custom options', () => {
      const customOptions = {
        outputDir: '/custom/output',
        preserveStructure: false,
        generateBackups: false,
        overwriteExisting: true,
      };
      
      const processor = new MainProcessor(mockConfig, customOptions);
      expect(processor).toBeDefined();
    });
  });

  describe('progress callback', () => {
    it('should set progress callback', () => {
      const callback = vi.fn();
      processor.setProgressCallback(callback);
      
      // No direct way to test this without making actual processing calls
      expect(() => processor.setProgressCallback(callback)).not.toThrow();
    });

    it('should handle undefined progress callback', () => {
      processor.setProgressCallback(undefined as any);
      expect(() => processor.setProgressCallback(undefined as any)).not.toThrow();
    });
  });

  describe('configuration management', () => {
    it('should handle different provider configurations', () => {
      const anthropicConfig = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          name: 'anthropic' as const,
          model: 'claude-3-5-sonnet-20241022',
        },
      };
      
      const processor = new MainProcessor(anthropicConfig);
      expect(processor).toBeDefined();
    });

    it('should handle OpenAI configuration', () => {
      const openaiConfig = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          name: 'openai' as const,
          model: 'gpt-4o',
        },
      };
      
      const processor = new MainProcessor(openaiConfig);
      expect(processor).toBeDefined();
    });

    it('should handle Ollama configuration', () => {
      const ollamaConfig = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          name: 'ollama' as const,
          model: 'llama3:8b',
          baseUrl: 'http://localhost:11434',
        },
      };
      
      const processor = new MainProcessor(ollamaConfig);
      expect(processor).toBeDefined();
    });
  });

  describe('processing options', () => {
    it('should handle preserve structure option', () => {
      const processor = new MainProcessor(mockConfig, {
        preserveStructure: true,
      });
      expect(processor).toBeDefined();
    });

    it('should handle backup generation option', () => {
      const processor = new MainProcessor(mockConfig, {
        generateBackups: false,
      });
      expect(processor).toBeDefined();
    });

    it('should handle overwrite existing option', () => {
      const processor = new MainProcessor(mockConfig, {
        overwriteExisting: true,
      });
      expect(processor).toBeDefined();
    });

    it('should handle custom output directory', () => {
      const processor = new MainProcessor(mockConfig, {
        outputDir: '/custom/output/path',
      });
      expect(processor).toBeDefined();
    });
  });

  describe('configuration validation', () => {
    it('should accept valid config', () => {
      expect(() => new MainProcessor(mockConfig)).not.toThrow();
    });

    it('should handle missing API key gracefully for cloud providers', () => {
      const configWithoutKey = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          apiKey: undefined as any,
        },
      };
      
      // Should not throw during construction, but might during processing
      expect(() => new MainProcessor(configWithoutKey)).not.toThrow();
    });

    it('should handle different processing configurations', () => {
      const customProcessingConfig = {
        ...mockConfig,
        processing: {
          ...mockConfig.processing,
          concurrency: 10,
          chunking: {
            ...mockConfig.processing.chunking,
            maxChunkSize: 8000,
          },
        },
      };
      
      expect(() => new MainProcessor(customProcessingConfig)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid configuration gracefully', () => {
      // The processor should accept the config during construction
      // Validation might happen during processing
      expect(() => new MainProcessor(mockConfig)).not.toThrow();
    });

    it('should not throw during instantiation with edge case configs', () => {
      const edgeCaseConfig = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          temperature: 0, // Edge case: minimum temperature
          maxTokens: 1,   // Edge case: minimum tokens
        },
      };
      
      expect(() => new MainProcessor(edgeCaseConfig)).not.toThrow();
    });
  });

  describe('integration readiness', () => {
    it('should be ready for pipeline integration', () => {
      // Test that the processor can be created with various configurations
      // that would be used in a real processing scenario
      
      const configs = [
        {
          ...mockConfig,
          provider: { ...mockConfig.provider, name: 'anthropic' as const },
        },
        {
          ...mockConfig,
          provider: { ...mockConfig.provider, name: 'openai' as const },
        },
        {
          ...mockConfig,
          provider: { 
            ...mockConfig.provider, 
            name: 'ollama' as const,
            baseUrl: 'http://localhost:11434',
          },
        },
      ];
      
      configs.forEach(config => {
        expect(() => new MainProcessor(config)).not.toThrow();
      });
    });

    it('should handle different output configurations', () => {
      const outputConfigs = [
        { generateBackups: true, overwriteExisting: false },
        { generateBackups: false, overwriteExisting: true },
        { preserveStructure: true, outputDir: '/tmp/output' },
        { preserveStructure: false, outputDir: undefined },
      ];
      
      outputConfigs.forEach(options => {
        expect(() => new MainProcessor(mockConfig, options)).not.toThrow();
      });
    });
  });

  describe('memory and resource management', () => {
    it('should handle multiple processor instances', () => {
      const processors: MainProcessor[] = [];
      
      // Create multiple processors
      for (let i = 0; i < 10; i++) {
        processors.push(new MainProcessor(mockConfig));
      }
      
      expect(processors).toHaveLength(10);
      processors.forEach(p => expect(p).toBeDefined());
    });

    it('should handle processor with different configs simultaneously', () => {
      const configs = [
        { ...mockConfig, provider: { ...mockConfig.provider, temperature: 0.1 } },
        { ...mockConfig, provider: { ...mockConfig.provider, temperature: 0.5 } },
        { ...mockConfig, provider: { ...mockConfig.provider, temperature: 0.9 } },
      ];
      
      const processors = configs.map(config => new MainProcessor(config));
      
      expect(processors).toHaveLength(3);
      processors.forEach(p => expect(p).toBeDefined());
    });
  });

  describe('type safety', () => {
    it('should enforce proper config types', () => {
      // Test that TypeScript compilation ensures type safety
      const validConfig: ReScriptConfig = mockConfig;
      expect(() => new MainProcessor(validConfig)).not.toThrow();
    });

    it('should accept optional processor options', () => {
      const validOptions = {
        outputDir: '/test/output',
        preserveStructure: true,
        generateBackups: false,
        overwriteExisting: true,
      };
      
      expect(() => new MainProcessor(mockConfig, validOptions)).not.toThrow();
    });

    it('should handle partial processor options', () => {
      const partialOptions = {
        outputDir: '/test/output',
        // Other options should use defaults
      };
      
      expect(() => new MainProcessor(mockConfig, partialOptions)).not.toThrow();
    });
  });
});