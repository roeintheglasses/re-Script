/**
 * Event types for progress tracking and real-time updates
 */

import { ProcessingError } from './processing.js';
import { JobProgress } from './job.js';

export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  jobId: string;
  progress?: JobProgress;
  error?: ProcessingError;
  timestamp: Date;
}

export type ProgressCallback = (event: ProgressEvent) => void;