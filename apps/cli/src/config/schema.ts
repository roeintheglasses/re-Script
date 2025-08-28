/**
 * Configuration schema validation using Zod
 */

import { z } from 'zod';

// Base schemas
const providerConfigSchema = z.object({
  name: z.enum(['openai', 'anthropic', 'ollama', 'azure', 'bedrock']),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  temperature: z.number().min(0).max(2).default(0.3),
  maxTokens: z.number().min(1).max(100000).default(8192),
  timeout: z.number().min(1000).default(30000),
});

const chunkingConfigSchema = z.object({
  strategy: z.enum(['simple', 'ast-aware', 'semantic']).default('ast-aware'),
  maxChunkSize: z.number().min(100).max(50000).default(4000),
  overlapPercentage: z.number().min(0).max(0.5).default(0.1),
  respectFunctionBoundaries: z.boolean().default(true),
});

const cachingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().min(0).default(86400), // 24 hours
  backend: z.enum(['memory', 'file', 'redis']).default('memory'),
  maxSize: z.number().min(0).default(100), // 100MB
});

const retryConfigSchema = z.object({
  maxAttempts: z.number().min(1).max(10).default(3),
  backoffFactor: z.number().min(1).max(10).default(2),
  maxDelay: z.number().min(1000).default(30000),
});

const processingConfigSchema = z.object({
  chunking: chunkingConfigSchema.default({}),
  caching: cachingConfigSchema.default({}),
  retries: retryConfigSchema.default({}),
  concurrency: z.number().min(1).max(20).default(5),
  preserveComments: z.boolean().default(false),
  preserveSourceMaps: z.boolean().default(true),
});

const prettierOptionsSchema = z.object({
  parser: z.string().default('babel'),
  printWidth: z.number().min(40).max(200).default(80),
  tabWidth: z.number().min(1).max(8).default(2),
  useTabs: z.boolean().default(false),
  semi: z.boolean().default(true),
  singleQuote: z.boolean().default(true),
  trailingComma: z.enum(['none', 'es5', 'all']).default('es5'),
});

const outputConfigSchema = z.object({
  format: z.enum(['prettier', 'custom']).default('prettier'),
  prettierOptions: prettierOptionsSchema.default({}),
  generateSourceMaps: z.boolean().default(true),
  addComments: z.boolean().default(false),
  commentStyle: z.enum(['block', 'line']).default('block'),
});

const pluginSystemConfigSchema = z.object({
  discovery: z.object({
    paths: z.array(z.string()).default(['./plugins', './node_modules/@rescript/plugins']),
    patterns: z.array(z.string()).default(['*.plugin.js', '*.plugin.mjs', '*-plugin.js']),
    excludePatterns: z.array(z.string()).optional(),
  }).default({}),
  security: z.object({
    allowedApis: z.array(z.string()).default(['fs', 'path', 'crypto']),
    allowedPaths: z.array(z.string()).default(['./plugins', './temp']),
    timeoutMs: z.number().min(1000).max(300000).default(30000),
    memoryLimitMB: z.number().min(10).max(1000).default(100),
    networkAccess: z.boolean().default(false),
  }).default({}),
  execution: z.object({
    hooks: z.object({
      beforeTransform: z.array(z.string()).optional(),
      afterTransform: z.array(z.string()).optional(),
      beforeAnalysis: z.array(z.string()).optional(),
      afterAnalysis: z.array(z.string()).optional(),
      onError: z.array(z.string()).optional(),
    }).default({}),
    chains: z.object({
      transformers: z.array(z.string()).default([]),
      analyzers: z.array(z.string()).default([]),
    }).default({}),
    configs: z.record(z.string(), z.object({
      enabled: z.boolean().default(true),
      priority: z.number().min(0).max(100).default(50),
      options: z.record(z.unknown()).default({}),
    })).default({}),
  }).default({}),
}).default({});

const advancedConfigSchema = z.object({
  enablePlugins: z.boolean().default(false),
  pluginPaths: z.array(z.string()).default([]),
  pluginConfig: pluginSystemConfigSchema,
  experimentalFeatures: z.array(z.string()).default([]),
  debugMode: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

// Main configuration schema
export const reScriptConfigSchema = z.object({
  provider: providerConfigSchema,
  processing: processingConfigSchema.default({}),
  output: outputConfigSchema.default({}),
  advanced: advancedConfigSchema.default({}),
});

// Partial config schema for merging with defaults
export const partialConfigSchema = z.object({
  provider: providerConfigSchema.partial().optional(),
  processing: processingConfigSchema.partial().optional(),
  output: outputConfigSchema.partial().optional(),
  advanced: advancedConfigSchema.partial().optional(),
}).partial();

// CLI options schema
export const cliOptionsSchema = z.object({
  input: z.string().min(1),
  output: z.string().optional(),
  config: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  concurrency: z.number().min(1).max(20).optional(),
  dryRun: z.boolean().default(false),
  watch: z.boolean().default(false),
  recursive: z.boolean().default(false),
  pattern: z.string().optional(),
  exclude: z.array(z.string()).default([]),
  verbose: z.boolean().default(false),
  quiet: z.boolean().default(false),
  force: z.boolean().default(false),
});

// Job input schema
export const jobInputSchema = z.object({
  files: z.array(z.string().min(1)),
  options: z.object({
    outputDir: z.string().optional(),
    recursive: z.boolean().default(false),
    pattern: z.string().optional(),
    exclude: z.array(z.string()).default([]),
  }).default({}),
});

// Export types derived from schemas
export type ReScriptConfig = z.infer<typeof reScriptConfigSchema>;
export type PartialConfig = z.infer<typeof partialConfigSchema>;
export type CliOptions = z.infer<typeof cliOptionsSchema>;
export type JobInput = z.infer<typeof jobInputSchema>;

// Default configuration
export const defaultConfig: ReScriptConfig = {
  provider: {
    name: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 8192,
    timeout: 30000,
  },
  processing: {
    chunking: {
      strategy: 'ast-aware',
      maxChunkSize: 4000,
      overlapPercentage: 0.1,
      respectFunctionBoundaries: true,
    },
    caching: {
      enabled: true,
      ttl: 86400,
      backend: 'memory',
      maxSize: 100,
    },
    retries: {
      maxAttempts: 3,
      backoffFactor: 2,
      maxDelay: 30000,
    },
    concurrency: 5,
    preserveComments: false,
    preserveSourceMaps: true,
  },
  output: {
    format: 'prettier',
    prettierOptions: {
      parser: 'babel',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    },
    generateSourceMaps: true,
    addComments: false,
    commentStyle: 'block',
  },
  advanced: {
    enablePlugins: false,
    pluginPaths: [],
    pluginConfig: {
      discovery: {
        paths: ['./plugins', './node_modules/@rescript/plugins'],
        patterns: ['*.plugin.js', '*.plugin.mjs', '*-plugin.js'],
      },
      security: {
        allowedApis: ['fs', 'path', 'crypto'],
        allowedPaths: ['./plugins', './temp'],
        timeoutMs: 30000,
        memoryLimitMB: 100,
        networkAccess: false,
      },
      execution: {
        hooks: {},
        chains: {
          transformers: [],
          analyzers: [],
        },
        configs: {},
      },
    },
    experimentalFeatures: [],
    debugMode: false,
    logLevel: 'info',
  },
};

// Validation functions
export function validateConfig(config: unknown): ReScriptConfig {
  return reScriptConfigSchema.parse(config);
}

export function validatePartialConfig(config: unknown): PartialConfig {
  return partialConfigSchema.parse(config);
}

export function validateCliOptions(options: unknown): CliOptions {
  return cliOptionsSchema.parse(options);
}

export function validateJobInput(input: unknown): JobInput {
  return jobInputSchema.parse(input);
}

// Configuration merging utility
export function mergeConfig(base: ReScriptConfig, override: PartialConfig): ReScriptConfig {
  const merged = { ...base };

  if (override.provider) {
    merged.provider = { ...merged.provider, ...override.provider };
  }

  if (override.processing) {
    merged.processing = { ...merged.processing, ...override.processing };
    
    if (override.processing.chunking) {
      merged.processing.chunking = { 
        ...merged.processing.chunking, 
        ...override.processing.chunking 
      };
    }
    
    if (override.processing.caching) {
      merged.processing.caching = { 
        ...merged.processing.caching, 
        ...override.processing.caching 
      };
    }
    
    if (override.processing.retries) {
      merged.processing.retries = { 
        ...merged.processing.retries, 
        ...override.processing.retries 
      };
    }
  }

  if (override.output) {
    merged.output = { ...merged.output, ...override.output };
    
    if (override.output.prettierOptions) {
      merged.output.prettierOptions = { 
        ...merged.output.prettierOptions, 
        ...override.output.prettierOptions 
      };
    }
  }

  if (override.advanced) {
    merged.advanced = { ...merged.advanced, ...override.advanced };
    
    if (override.advanced.pluginConfig) {
      merged.advanced.pluginConfig = { 
        ...merged.advanced.pluginConfig, 
        ...override.advanced.pluginConfig 
      };
      
      if (override.advanced.pluginConfig.discovery) {
        merged.advanced.pluginConfig.discovery = { 
          ...merged.advanced.pluginConfig.discovery, 
          ...override.advanced.pluginConfig.discovery 
        };
      }
      
      if (override.advanced.pluginConfig.security) {
        merged.advanced.pluginConfig.security = { 
          ...merged.advanced.pluginConfig.security, 
          ...override.advanced.pluginConfig.security 
        };
      }
      
      if (override.advanced.pluginConfig.execution) {
        merged.advanced.pluginConfig.execution = { 
          ...merged.advanced.pluginConfig.execution, 
          ...override.advanced.pluginConfig.execution 
        };
        
        if (override.advanced.pluginConfig.execution.hooks) {
          merged.advanced.pluginConfig.execution.hooks = { 
            ...merged.advanced.pluginConfig.execution.hooks, 
            ...override.advanced.pluginConfig.execution.hooks 
          };
        }
        
        if (override.advanced.pluginConfig.execution.chains) {
          merged.advanced.pluginConfig.execution.chains = { 
            ...merged.advanced.pluginConfig.execution.chains, 
            ...override.advanced.pluginConfig.execution.chains 
          };
        }
        
        if (override.advanced.pluginConfig.execution.configs) {
          merged.advanced.pluginConfig.execution.configs = { 
            ...merged.advanced.pluginConfig.execution.configs, 
            ...override.advanced.pluginConfig.execution.configs 
          };
        }
      }
    }
  }

  return validateConfig(merged);
}

// Environment variable mapping
export const envVarMapping = {
  RESCRIPT_PROVIDER: 'provider.name',
  RESCRIPT_MODEL: 'provider.model',
  OPENAI_API_KEY: 'provider.apiKey',
  ANTHROPIC_API_KEY: 'provider.apiKey',
  OLLAMA_BASE_URL: 'provider.baseUrl',
  RESCRIPT_TEMPERATURE: 'provider.temperature',
  RESCRIPT_MAX_TOKENS: 'provider.maxTokens',
  RESCRIPT_CONCURRENCY: 'processing.concurrency',
  RESCRIPT_DEBUG: 'advanced.debugMode',
  RESCRIPT_LOG_LEVEL: 'advanced.logLevel',
} as const;