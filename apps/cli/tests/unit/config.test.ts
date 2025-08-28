/**
 * Tests for configuration system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigLoader } from '../../src/config/loader.js';
import { defaultConfig, validateConfig } from '../../src/config/schema.js';
import { InvalidConfigError } from '../../src/utils/errors.js';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;

  beforeEach(() => {
    configLoader = new ConfigLoader();
  });

  describe('getDefaultConfig', () => {
    it('should return valid default configuration', () => {
      const config = configLoader.getDefaultConfig();
      expect(() => validateConfig(config)).not.toThrow();
      expect(config.provider.name).toBe('anthropic');
      expect(config.provider.model).toBe('claude-3-5-sonnet-20241022');
    });
  });

  describe('validateCliOverride', () => {
    it('should validate valid CLI options', () => {
      const options = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000,
      };

      const override = configLoader.validateCliOverride(options);
      expect(override.provider?.name).toBe('openai');
      expect(override.provider?.model).toBe('gpt-4');
      expect(override.provider?.temperature).toBe(0.5);
      expect(override.provider?.maxTokens).toBe(4000);
    });

    it('should reject invalid provider', () => {
      const options = { provider: 'invalid-provider' };
      expect(() => configLoader.validateCliOverride(options)).toThrow(InvalidConfigError);
    });

    it('should reject invalid temperature', () => {
      const options = { temperature: 3.0 };
      expect(() => configLoader.validateCliOverride(options)).toThrow(InvalidConfigError);
    });

    it('should reject invalid concurrency', () => {
      const options = { concurrency: 25 };
      expect(() => configLoader.validateCliOverride(options)).toThrow(InvalidConfigError);
    });
  });

  describe('validateConfigWithFeedback', () => {
    it('should validate correct config', () => {
      const result = configLoader.validateConfigWithFeedback(defaultConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const invalidConfig = {
        provider: {
          name: 'openai',
          // missing model field
        },
      };

      const result = configLoader.validateConfigWithFeedback(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide warnings for potential issues', () => {
      const configWithWarnings = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          name: 'ollama' as const,
          // missing baseUrl for ollama
        },
      };

      const result = configLoader.validateConfigWithFeedback(configWithWarnings);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Ollama provider requires baseUrl');
    });
  });
});

describe('Configuration Schema', () => {
  describe('validateConfig', () => {
    it('should accept valid config', () => {
      expect(() => validateConfig(defaultConfig)).not.toThrow();
    });

    it('should apply defaults for missing optional fields', () => {
      const minimalConfig = {
        provider: {
          name: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
        },
      };

      const validated = validateConfig(minimalConfig);
      expect(validated.provider.temperature).toBe(0.3);
      expect(validated.processing.concurrency).toBe(5);
      expect(validated.output.format).toBe('prettier');
    });

    it('should reject invalid provider name', () => {
      const invalidConfig = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          name: 'invalid-provider',
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should reject invalid temperature range', () => {
      const invalidConfig = {
        ...defaultConfig,
        provider: {
          ...defaultConfig.provider,
          temperature: 5.0,
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });

    it('should reject invalid chunking strategy', () => {
      const invalidConfig = {
        ...defaultConfig,
        processing: {
          ...defaultConfig.processing,
          chunking: {
            ...defaultConfig.processing.chunking,
            strategy: 'invalid-strategy' as any,
          },
        },
      };

      expect(() => validateConfig(invalidConfig)).toThrow();
    });
  });
});