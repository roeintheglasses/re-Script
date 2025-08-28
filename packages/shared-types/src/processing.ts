/**
 * Processing pipeline types and interfaces
 */

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
  sourceMap?: import('./source-map.js').SourceMapData;
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

export interface ProcessingConfig {
  chunking: ChunkingConfig;
  caching: import('./cache.js').CachingConfig;
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

export interface RetryConfig {
  maxAttempts: number;
  backoffFactor: number;
  maxDelay: number;
}

