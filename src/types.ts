/**
 * Core types and interfaces for re-Script v2
 */

// LLM Provider Types
export interface LLMProvider {
  name: string;
  models: string[];
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
}

export interface LLMRequest {
  code: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  suggestions: RenameSuggestion[];
  confidence: number;
  tokensUsed: number;
  processingTime: number;
}

export interface RenameSuggestion {
  originalName: string;
  suggestedName: string;
  confidence: number;
  reasoning?: string;
  type: 'variable' | 'function' | 'class' | 'method' | 'property';
}

// Processing Pipeline Types
export interface ProcessingStep {
  name: string;
  description: string;
  execute(input: ProcessingInput): Promise<ProcessingOutput>;
}

export interface ProcessingInput {
  code: string;
  metadata: ProcessingMetadata;
  config: ProcessingConfig;
}

export interface ProcessingOutput {
  code: string;
  metadata: ProcessingMetadata;
  success: boolean;
  error?: ProcessingError;
  warnings?: string[];
}

export interface ProcessingMetadata {
  fileName?: string;
  fileSize: number;
  chunkIndex?: number;
  totalChunks?: number;
  sourceMap?: SourceMapData;
  statistics: ProcessingStatistics;
}

export interface ProcessingStatistics {
  linesOfCode: number;
  functionsCount: number;
  variablesCount: number;
  complexityScore: number;
  tokensCount: number;
}

export interface ProcessingError {
  code: string;
  message: string;
  stack?: string;
  step: string;
  recoverable: boolean;
  suggestions?: string[];
}

// Configuration Types
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

export interface ProcessingConfig {
  chunking: ChunkingConfig;
  caching: CachingConfig;
  retries: RetryConfig;
  concurrency: number;
  preserveComments: boolean;
  preserveSourceMaps: boolean;
}

export interface ChunkingConfig {
  strategy: 'simple' | 'ast-aware' | 'semantic';
  maxChunkSize: number;
  overlapPercentage: number;
  respectFunctionBoundaries: boolean;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  backend: 'memory' | 'file' | 'redis';
  maxSize: number;
}

export interface RetryConfig {
  maxAttempts: number;
  backoffFactor: number;
  maxDelay: number;
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

// Job Management Types
export interface ProcessingJob {
  id: string;
  status: JobStatus;
  input: JobInput;
  output?: JobOutput;
  config: ReScriptConfig;
  progress: JobProgress;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: ProcessingError;
}

export type JobStatus = 
  | 'pending'
  | 'running' 
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobInput {
  files: string[];
  options: {
    outputDir?: string;
    recursive?: boolean;
    pattern?: string;
    exclude?: string[];
  };
}

export interface JobOutput {
  files: ProcessedFile[];
  summary: ProcessingSummary;
}

export interface ProcessedFile {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: ProcessingError;
  statistics: ProcessingStatistics;
  processingTime: number;
}

export interface ProcessingSummary {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalProcessingTime: number;
  tokensUsed: number;
  cost?: number;
}

export interface JobProgress {
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentFile?: string;
}

// Cache Types
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  size: number;
}

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

// Plugin Types
export interface Plugin {
  name: string;
  version: string;
  description: string;
  transformers?: Transformer[];
  hooks?: PluginHooks;
}

export interface Transformer {
  name: string;
  stage: 'pre' | 'post' | 'llm';
  transform(input: ProcessingInput): Promise<ProcessingOutput>;
}

export interface PluginHooks {
  beforeProcessing?: (input: ProcessingInput) => Promise<ProcessingInput>;
  afterProcessing?: (output: ProcessingOutput) => Promise<ProcessingOutput>;
  onError?: (error: ProcessingError) => Promise<void>;
}

// Source Map Types
export interface SourceMapData {
  version: number;
  sources: string[];
  names: string[];
  mappings: string;
  sourcesContent?: string[];
}

// Utility Types
export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> = 
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event Types for Progress Tracking
export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  jobId: string;
  progress?: JobProgress;
  error?: ProcessingError;
  timestamp: Date;
}

export type ProgressCallback = (event: ProgressEvent) => void;