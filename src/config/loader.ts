/**
 * Configuration loading and management
 */

import { cosmiconfigSync } from 'cosmiconfig';
import { z } from 'zod';
import { 
  ReScriptConfig, 
  PartialConfig, 
  defaultConfig, 
  validateConfig, 
  validatePartialConfig, 
  mergeConfig,
  envVarMapping 
} from './schema.js';
import { InvalidConfigError } from '../utils/errors.js';

const CONFIG_MODULE_NAME = 'rescript';

export class ConfigLoader {
  private explorer = cosmiconfigSync(CONFIG_MODULE_NAME, {
    searchPlaces: [
      'package.json',
      `.${CONFIG_MODULE_NAME}rc`,
      `.${CONFIG_MODULE_NAME}rc.json`,
      `.${CONFIG_MODULE_NAME}rc.yaml`,
      `.${CONFIG_MODULE_NAME}rc.yml`,
      `.${CONFIG_MODULE_NAME}rc.js`,
      `.${CONFIG_MODULE_NAME}rc.mjs`,
      `.${CONFIG_MODULE_NAME}rc.cjs`,
      `${CONFIG_MODULE_NAME}.config.js`,
      `${CONFIG_MODULE_NAME}.config.mjs`,
      `${CONFIG_MODULE_NAME}.config.cjs`,
    ],
  });

  /**
   * Load configuration from files and environment variables
   */
  async loadConfig(configPath?: string): Promise<ReScriptConfig> {
    let fileConfig: PartialConfig = {};

    // Load from config file
    try {
      const result = configPath 
        ? this.explorer.load(configPath)
        : this.explorer.search();

      if (result?.config) {
        fileConfig = validatePartialConfig(result.config);
      }
    } catch (error) {
      throw new InvalidConfigError(
        `Failed to load config file: ${error instanceof Error ? error.message : String(error)}`,
        ['Check config file syntax', 'Validate JSON/YAML format']
      );
    }

    // Load from environment variables
    const envConfig = this.loadFromEnvironment();

    // Merge configurations: defaults < file < environment < CLI args
    let config = mergeConfig(defaultConfig, fileConfig);
    config = mergeConfig(config, envConfig);

    return config;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): PartialConfig {
    const envConfig: Record<string, unknown> = {};

    Object.entries(envVarMapping).forEach(([envVar, configPath]) => {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseEnvValue(value, configPath));
      }
    });

    try {
      return validatePartialConfig(envConfig);
    } catch (error) {
      throw new InvalidConfigError(
        `Invalid environment variable configuration: ${error instanceof Error ? error.message : String(error)}`,
        ['Check environment variable values', 'Ensure correct data types']
      );
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  private parseEnvValue(value: string, configPath: string): unknown {
    // Boolean values
    if (configPath.includes('debugMode') || configPath.includes('enabled')) {
      return value.toLowerCase() === 'true';
    }

    // Numeric values
    if (configPath.includes('temperature') || 
        configPath.includes('maxTokens') || 
        configPath.includes('concurrency') ||
        configPath.includes('timeout')) {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Invalid numeric value for ${configPath}: ${value}`);
      }
      return num;
    }

    // Array values
    if (configPath.includes('pluginPaths') || 
        configPath.includes('experimentalFeatures')) {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }

    // String values (default)
    return value;
  }

  /**
   * Set nested object value using dot notation path
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = keys[keys.length - 1]!;
    current[lastKey] = value;
  }

  /**
   * Validate and normalize CLI options into config override
   */
  validateCliOverride(options: Record<string, unknown>): PartialConfig {
    const override: PartialConfig = {};

    // Provider options
    if (options.provider || options.model || options.apiKey || 
        options.temperature || options.maxTokens) {
      override.provider = {};
      
      if (typeof options.provider === 'string') {
        if (!['openai', 'anthropic', 'ollama', 'azure', 'bedrock'].includes(options.provider)) {
          throw new InvalidConfigError(`Invalid provider: ${options.provider}`);
        }
        override.provider.name = options.provider as 'openai' | 'anthropic' | 'ollama' | 'azure' | 'bedrock';
      }

      if (typeof options.model === 'string') {
        override.provider.model = options.model;
      }

      if (typeof options.apiKey === 'string') {
        override.provider.apiKey = options.apiKey;
      }

      if (typeof options.temperature === 'number') {
        if (options.temperature < 0 || options.temperature > 2) {
          throw new InvalidConfigError('Temperature must be between 0 and 2');
        }
        override.provider.temperature = options.temperature;
      }

      if (typeof options.maxTokens === 'number') {
        if (options.maxTokens < 1 || options.maxTokens > 100000) {
          throw new InvalidConfigError('Max tokens must be between 1 and 100000');
        }
        override.provider.maxTokens = options.maxTokens;
      }
    }

    // Processing options
    if (options.concurrency) {
      override.processing = { concurrency: Number(options.concurrency) };
      
      if (override.processing.concurrency < 1 || override.processing.concurrency > 20) {
        throw new InvalidConfigError('Concurrency must be between 1 and 20');
      }
    }

    // Advanced options
    if (options.verbose || options.quiet) {
      override.advanced = {};
      
      if (options.verbose) {
        override.advanced.logLevel = 'debug';
      } else if (options.quiet) {
        override.advanced.logLevel = 'error';
      }
    }

    try {
      return validatePartialConfig(override);
    } catch (error) {
      throw new InvalidConfigError(
        `Invalid CLI options: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: ReScriptConfig, filePath = '.rescriptrc.json'): Promise<void> {
    const fs = await import('fs/promises');
    
    try {
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      throw new InvalidConfigError(
        `Failed to save config to ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): ReScriptConfig {
    return { ...defaultConfig };
  }

  /**
   * Validate configuration and provide detailed feedback
   */
  validateConfigWithFeedback(config: unknown): {
    valid: boolean;
    config?: ReScriptConfig;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      valid: false,
      config: undefined as ReScriptConfig | undefined,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      result.config = validateConfig(config);
      result.valid = true;

      // Add warnings for common issues
      if (result.config.provider.name === 'ollama' && !result.config.provider.baseUrl) {
        result.warnings.push('Ollama provider requires baseUrl to be set');
      }

      if (result.config.provider.maxTokens > 32000) {
        result.warnings.push('Very high maxTokens setting may cause performance issues');
      }

      if (result.config.processing.concurrency > 10) {
        result.warnings.push('High concurrency may trigger rate limits');
      }

      if (!result.config.processing.caching.enabled) {
        result.warnings.push('Caching is disabled - this may increase costs and processing time');
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
      } else {
        result.errors = [error instanceof Error ? error.message : String(error)];
      }
    }

    return result;
  }
}

// Singleton instance
export const configLoader = new ConfigLoader();