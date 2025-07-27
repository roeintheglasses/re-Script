/**
 * Job management system with persistence and resumability
 */

import { ProcessingJob, JobStatus, JobInput, ProcessedFile, ProcessingSummary, ReScriptConfig, ProgressEvent } from '../types.js';
import { ReScriptError, ErrorCode } from '../utils/errors.js';
import { JobPersistenceManager, JobPersistenceConfig } from './persistence.js';
import { MainProcessor, ProcessorOptions } from '../core/processor.js';
import { createOptimalProcessor } from '../utils/streaming.js';

export interface JobManagerConfig {
  persistence: JobPersistenceConfig;
  maxConcurrentJobs: number;
  defaultTimeout: number;
  enableProgressTracking: boolean;
  autoCleanupCompleted: boolean;
}

export interface JobCreationOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  resumable?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface JobExecutionContext {
  jobId: string;
  processor: MainProcessor;
  persistenceManager?: JobPersistenceManager;
  startTime: Date;
  lastProgressUpdate: Date;
  totalFiles: number;
  processedFiles: ProcessedFile[];
  abortController: AbortController;
}

export class JobManager {
  private config: JobManagerConfig;
  private persistenceManager: JobPersistenceManager;
  private activeJobs = new Map<string, JobExecutionContext>();
  private jobQueue: ProcessingJob[] = [];
  private isProcessingQueue = false;

  constructor(config: JobManagerConfig) {
    this.config = {
      maxConcurrentJobs: 3,
      defaultTimeout: 300000, // 5 minutes
      enableProgressTracking: true,
      autoCleanupCompleted: true,
      ...config,
    };

    this.persistenceManager = new JobPersistenceManager(this.config.persistence);
  }

  /**
   * Initialize job manager
   */
  async initialize(): Promise<void> {
    await this.persistenceManager.initialize();
    
    // Start processing queue
    this.startQueueProcessor();
    
    console.log('Job manager initialized');
  }

  /**
   * Create a new processing job
   */
  async createJob(
    input: JobInput,
    config: ReScriptConfig,
    options: JobCreationOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: ProcessingJob = {
      id: jobId,
      status: 'pending',
      input,
      config,
      progress: {
        currentStep: 'Initializing',
        stepsCompleted: 0,
        totalSteps: input.files.length,
        percentage: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add job to queue
    this.jobQueue.push(job);
    
    // Save initial job state if persistence is enabled
    if (this.config.persistence.enabled && options.resumable !== false) {
      await this.persistenceManager.saveJobSnapshot(job);
    }

    // Start processing queue if not already running
    this.processQueue();

    return jobId;
  }

  /**
   * Resume a job from persistence
   */
  async resumeJob(jobId: string, config?: ReScriptConfig): Promise<boolean> {
    try {
      const existingJob = this.activeJobs.get(jobId);
      if (existingJob) {
        throw new ReScriptError(
          ErrorCode.UNKNOWN_ERROR,
          `Job ${jobId} is already running`,
          'job-resume'
        );
      }

      const resumeResult = await this.persistenceManager.resumeJob(
        jobId, 
        config || {} as ReScriptConfig
      );

      if (!resumeResult.success) {
        throw new ReScriptError(
          ErrorCode.UNKNOWN_ERROR,
          resumeResult.error || 'Failed to resume job',
          'job-resume'
        );
      }

      const { job, remainingFiles, processedFiles } = resumeResult;
      
      if (!job || !remainingFiles || !processedFiles) {
        throw new ReScriptError(
          ErrorCode.UNKNOWN_ERROR,
          'Incomplete job resume data',
          'job-resume'
        );
      }

      // Update job input to only include remaining files
      job.input.files = remainingFiles;
      job.status = 'pending';
      job.updatedAt = new Date();

      // Add to queue for processing
      this.jobQueue.unshift(job); // Add to front for higher priority

      // Start processing
      this.processQueue();

      console.log(`Job ${jobId} resumed with ${remainingFiles.length} remaining files`);
      return true;

    } catch (error) {
      console.error(`Failed to resume job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const context = this.activeJobs.get(jobId);
    
    if (context) {
      // Signal cancellation
      context.abortController.abort();
      
      // Update job status
      const job = await this.getJobStatus(jobId);
      if (job) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        
        // Save final state
        if (this.config.persistence.enabled) {
          await this.persistenceManager.saveJobSnapshot(
            job,
            context.processedFiles
          );
        }
      }
      
      // Remove from active jobs
      this.activeJobs.delete(jobId);
      
      console.log(`Job ${jobId} cancelled`);
      return true;
    }

    // Try to remove from queue
    const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
    if (queueIndex >= 0) {
      const job = this.jobQueue[queueIndex]!;
      job.status = 'cancelled';
      job.updatedAt = new Date();
      
      this.jobQueue.splice(queueIndex, 1);
      
      console.log(`Job ${jobId} removed from queue`);
      return true;
    }

    return false;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    // Check active jobs first
    const context = this.activeJobs.get(jobId);
    if (context) {
      // Return current state from persistence if available
      const snapshot = await this.persistenceManager.loadJobSnapshot(jobId);
      if (snapshot.success && snapshot.job) {
        return snapshot.job;
      }
    }

    // Check queue
    const queuedJob = this.jobQueue.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }

    // Check persistence
    const persistedSnapshot = await this.persistenceManager.loadJobSnapshot(jobId);
    if (persistedSnapshot.success && persistedSnapshot.job) {
      return persistedSnapshot.job;
    }

    return null;
  }

  /**
   * List all jobs
   */
  async listJobs(filter?: {
    status?: JobStatus[];
    limit?: number;
    offset?: number;
  }): Promise<ProcessingJob[]> {
    const jobs: ProcessingJob[] = [];

    // Add active jobs
    for (const context of this.activeJobs.values()) {
      const job = await this.getJobStatus(context.jobId);
      if (job) jobs.push(job);
    }

    // Add queued jobs
    jobs.push(...this.jobQueue);

    // Add persisted jobs
    const persistedJobs = await this.persistenceManager.listPersistedJobs();
    for (const persistedInfo of persistedJobs) {
      if (!jobs.some(job => job.id === persistedInfo.id)) {
        const snapshot = await this.persistenceManager.loadJobSnapshot(persistedInfo.id);
        if (snapshot.success && snapshot.job) {
          jobs.push(snapshot.job);
        }
      }
    }

    // Apply filters
    let filteredJobs = jobs;
    
    if (filter?.status) {
      filteredJobs = filteredJobs.filter(job => filter.status!.includes(job.status));
    }

    // Sort by creation date (newest first)
    filteredJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filter?.offset || filter?.limit) {
      const start = filter.offset || 0;
      const end = filter.limit ? start + filter.limit : undefined;
      filteredJobs = filteredJobs.slice(start, end);
    }

    return filteredJobs;
  }

  /**
   * Delete job and its data
   */
  async deleteJob(jobId: string): Promise<boolean> {
    try {
      // Cancel if running
      await this.cancelJob(jobId);
      
      // Delete from persistence
      await this.persistenceManager.deleteJobSnapshot(jobId);
      
      console.log(`Job ${jobId} deleted`);
      return true;

    } catch (error) {
      console.error(`Failed to delete job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get job execution statistics
   */
  getExecutionStats(): {
    activeJobs: number;
    queuedJobs: number;
    totalJobsProcessed: number;
    averageProcessingTime: number;
  } {
    return {
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      totalJobsProcessed: 0, // Would need to track this
      averageProcessingTime: 0, // Would need to track this
    };
  }

  /**
   * Cleanup completed jobs and resources
   */
  async cleanup(): Promise<void> {
    // Cancel all active jobs
    const cancelPromises = Array.from(this.activeJobs.keys()).map(jobId => 
      this.cancelJob(jobId)
    );
    await Promise.all(cancelPromises);

    // Clear queue
    this.jobQueue.length = 0;

    // Cleanup persistence
    await this.persistenceManager.cleanup();

    console.log('Job manager cleaned up');
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `job_${timestamp}_${random}`;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  /**
   * Process job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) return;
    if (this.jobQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      while (
        this.activeJobs.size < this.config.maxConcurrentJobs && 
        this.jobQueue.length > 0
      ) {
        const job = this.jobQueue.shift();
        if (job) {
          await this.startJobExecution(job);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start executing a job
   */
  private async startJobExecution(job: ProcessingJob): Promise<void> {
    const abortController = new AbortController();
    
    const context: JobExecutionContext = {
      jobId: job.id,
      processor: new MainProcessor(job.config),
      persistenceManager: this.config.persistence.enabled ? this.persistenceManager : undefined,
      startTime: new Date(),
      lastProgressUpdate: new Date(),
      totalFiles: job.input.files.length,
      processedFiles: [],
      abortController,
    };

    // Add to active jobs
    this.activeJobs.set(job.id, context);

    // Update job status
    job.status = 'running';
    job.updatedAt = new Date();

    try {
      // Set up progress tracking
      if (this.config.enableProgressTracking) {
        context.processor.setProgressCallback((event: ProgressEvent) => {
          this.handleProgressUpdate(context, job, event);
        });
      }

      // Check if we should use streaming for large files
      const largeFiles = [];
      for (const filePath of job.input.files) {
        const optimal = await createOptimalProcessor(filePath);
        if (optimal.type === 'streaming') {
          largeFiles.push(filePath);
        }
      }

      if (largeFiles.length > 0) {
        console.log(`Using streaming processing for ${largeFiles.length} large files`);
      }

      // Process files
      const summary = await context.processor.processFiles(
        job.input.files,
        job.input.options.outputDir,
        job.id
      );

      // Update job completion
      job.status = 'completed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.output = {
        files: context.processedFiles,
        summary,
      };

      // Save final state
      if (context.persistenceManager) {
        await context.persistenceManager.saveJobSnapshot(
          job,
          context.processedFiles
        );
      }

      console.log(`Job ${job.id} completed successfully`);

      // Auto-cleanup if enabled
      if (this.config.autoCleanupCompleted) {
        setTimeout(() => {
          this.deleteJob(job.id);
        }, 60000); // Delete after 1 minute
      }

    } catch (error) {
      // Handle job failure
      job.status = 'failed';
      job.error = {
        code: 'JOB_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        step: 'execution',
        recoverable: true,
        suggestions: ['Check input files', 'Verify configuration', 'Try resuming the job'],
      };
      job.updatedAt = new Date();

      // Save error state
      if (context.persistenceManager) {
        await context.persistenceManager.saveJobSnapshot(
          job,
          context.processedFiles
        );
      }

      console.error(`Job ${job.id} failed:`, error);

    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Handle progress updates
   */
  private async handleProgressUpdate(
    context: JobExecutionContext,
    job: ProcessingJob,
    event: ProgressEvent
  ): Promise<void> {
    if (event.progress) {
      job.progress = event.progress;
      job.updatedAt = new Date();
      context.lastProgressUpdate = new Date();

      // Save progress periodically
      if (context.persistenceManager) {
        const timeSinceLastSave = Date.now() - context.lastProgressUpdate.getTime();
        if (timeSinceLastSave > 10000) { // Save every 10 seconds
          await context.persistenceManager.saveJobSnapshot(
            job,
            context.processedFiles
          );
        }
      }
    }

    if (event.type === 'error' && event.error) {
      console.warn(`Job ${job.id} progress error:`, event.error);
    }
  }
}

/**
 * Create job manager from configuration
 */
export function createJobManager(config: Partial<JobManagerConfig>): JobManager {
  const defaultConfig: JobManagerConfig = {
    persistence: {
      enabled: true,
      storageDir: '.rescript-jobs',
      autoSaveInterval: 30000,
      maxStoredJobs: 100,
      compressionEnabled: false,
      encryptionEnabled: false,
      retentionDays: 30,
    },
    maxConcurrentJobs: 3,
    defaultTimeout: 300000,
    enableProgressTracking: true,
    autoCleanupCompleted: false,
  };

  return new JobManager({ ...defaultConfig, ...config });
}