/**
 * Job management types and interfaces
 */

import { ReScriptConfig } from './config.js';
import { ProcessingError, ProcessingStatistics } from './processing.js';

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