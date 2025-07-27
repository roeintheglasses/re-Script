/**
 * Plugin system type definitions
 */

import { ReScriptConfig, ProcessingResult, JobInput } from '../types.js';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  category: 'transformer' | 'provider' | 'analyzer' | 'formatter' | 'utility';
  dependencies?: string[];
  compatibleVersions?: string[];
}

export interface PluginConfig {
  enabled: boolean;
  priority: number;
  options: Record<string, unknown>;
}

export interface PluginContext {
  config: ReScriptConfig;
  input: JobInput;
  metadata: Record<string, unknown>;
  utils: PluginUtils;
}

export interface PluginUtils {
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
  cache: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
  };
}

export interface TransformerPlugin {
  metadata: PluginMetadata;
  
  /**
   * Initialize the plugin
   */
  init?(context: PluginContext): Promise<void> | void;
  
  /**
   * Check if this plugin can handle the given input
   */
  canHandle?(input: string, context: PluginContext): Promise<boolean> | boolean;
  
  /**
   * Transform the input code
   */
  transform(input: string, context: PluginContext): Promise<string>;
  
  /**
   * Cleanup plugin resources
   */
  cleanup?(context: PluginContext): Promise<void> | void;
}

export interface AnalyzerPlugin {
  metadata: PluginMetadata;
  
  init?(context: PluginContext): Promise<void> | void;
  
  /**
   * Analyze code and return insights
   */
  analyze(input: string, context: PluginContext): Promise<AnalysisResult>;
  
  cleanup?(context: PluginContext): Promise<void> | void;
}

export interface AnalysisResult {
  complexity?: number;
  suggestions?: string[];
  warnings?: string[];
  metrics?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface ProviderPlugin {
  metadata: PluginMetadata;
  
  init?(context: PluginContext): Promise<void> | void;
  
  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Process code with custom provider
   */
  process(input: string, context: PluginContext): Promise<ProcessingResult>;
  
  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities;
  
  cleanup?(context: PluginContext): Promise<void> | void;
}

export interface ProviderCapabilities {
  maxInputLength: number;
  supportedFormats: string[];
  streaming: boolean;
  concurrent: boolean;
  costEstimation: boolean;
}

export interface PluginRegistry {
  transformers: Map<string, TransformerPlugin>;
  analyzers: Map<string, AnalyzerPlugin>;
  providers: Map<string, ProviderPlugin>;
}

export interface PluginLoadResult {
  success: boolean;
  plugin?: TransformerPlugin | AnalyzerPlugin | ProviderPlugin;
  error?: string;
  warnings?: string[];
}

export interface PluginDiscovery {
  paths: string[];
  patterns: string[];
  excludePatterns?: string[];
}

export interface PluginExecution {
  plugin: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  error?: string;
  metrics?: Record<string, number>;
}

export interface PluginChain {
  plugins: string[];
  mode: 'sequential' | 'parallel' | 'conditional';
  continueOnError: boolean;
  timeout?: number;
}

export interface ConditionalRule {
  condition: string; // JavaScript expression
  plugin: string;
  priority: number;
}

export interface PluginHooks {
  beforeTransform?: string[];
  afterTransform?: string[];
  beforeAnalysis?: string[];
  afterAnalysis?: string[];
  onError?: string[];
}

export type PluginType = TransformerPlugin | AnalyzerPlugin | ProviderPlugin;

export interface PluginValidator {
  validateMetadata(metadata: PluginMetadata): { valid: boolean; errors: string[] };
  validatePlugin(plugin: PluginType): { valid: boolean; errors: string[] };
  validateConfig(config: PluginConfig): { valid: boolean; errors: string[] };
}

export interface PluginSandbox {
  allowedApis: string[];
  allowedPaths: string[];
  timeoutMs: number;
  memoryLimitMB: number;
  networkAccess: boolean;
}

export interface PluginSecurity {
  sandbox: PluginSandbox;
  signatureValidation: boolean;
  trustedSources: string[];
  permissions: PluginPermissions;
}

export interface PluginPermissions {
  fileSystem: {
    read: string[];
    write: string[];
  };
  network: {
    allowed: string[];
    blocked: string[];
  };
  apis: string[];
}