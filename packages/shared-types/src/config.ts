/**
 * Configuration types and interfaces
 */

import { ProcessingConfig, ChunkingConfig, RetryConfig } from './processing.js';
import { CachingConfig } from './cache.js';

export interface ReScriptConfig {
  provider: ProviderConfig;
  processing: ProcessingConfig;
  output: OutputConfig;
  advanced: AdvancedConfig;
}

export interface ProviderConfig {
  name: 'openai' | 'anthropic' | 'ollama' | 'azure' | 'bedrock';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface OutputConfig {
  format: 'prettier' | 'custom';
  prettierOptions: PrettierOptions;
  generateSourceMaps: boolean;
  addComments: boolean;
  commentStyle: 'block' | 'line';
}

export interface PrettierOptions {
  parser: string;
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: 'none' | 'es5' | 'all';
}

export interface AdvancedConfig {
  enablePlugins: boolean;
  pluginPaths: string[];
  pluginConfig: PluginSystemConfig;
  experimentalFeatures: string[];
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface PluginSystemConfig {
  discovery: {
    paths: string[];
    patterns: string[];
    excludePatterns?: string[];
  };
  security: {
    allowedApis: string[];
    allowedPaths: string[];
    timeoutMs: number;
    memoryLimitMB: number;
    networkAccess: boolean;
  };
  execution: {
    hooks: {
      beforeTransform?: string[];
      afterTransform?: string[];
      beforeAnalysis?: string[];
      afterAnalysis?: string[];
      onError?: string[];
    };
    chains: {
      transformers: string[];
      analyzers: string[];
    };
    configs: Record<string, {
      enabled: boolean;
      priority: number;
      options: Record<string, unknown>;
    }>;
  };
}

// Re-export from processing for convenience
export type { ProcessingConfig, ChunkingConfig, RetryConfig };
export type { CachingConfig };

// Alias for backward compatibility
export type Config = ReScriptConfig;