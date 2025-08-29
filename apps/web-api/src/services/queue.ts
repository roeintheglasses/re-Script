/**
 * Bull queue setup for job processing
 */

import Bull, { Queue, Job, JobOptions } from 'bull';
import { config } from '../config/env.js';
import { ProcessingJob, JobStatus } from '@re-script/shared-types';
import { redisService } from './redis.js';
import { jobProcessorService } from './processor.js';

// Job data interface for Bull queue
export interface QueueJobData {
  jobId: string;
  files: string[];
  config: any;
  metadata: {
    userId?: string;
    createdAt: string;
  };
}

export interface JobProgressData {
  percentage: number;
  currentFile?: string;
  currentStep: string;
  estimatedTimeRemaining?: number;
}

export class JobQueueService {
  private queue: Queue<QueueJobData>;
  private jobs = new Map<string, ProcessingJob>();

  constructor() {
    // Create Bull queue with Redis connection
    this.queue = new Bull<QueueJobData>('re-script-processing', {
      redis: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
        db: config.REDIS_DB,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 20,     // Keep last 20 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      settings: {
        stalledInterval: 30 * 1000,    // 30 seconds
        maxStalledCount: 1,
      },
    });

    this.setupJobProcessors();
    this.setupJobEventHandlers();
  }

  private setupJobProcessors() {
    // Process jobs with concurrency limit
    this.queue.process(config.MAX_CONCURRENT_JOBS, this.processJob.bind(this));
  }

  private setupJobEventHandlers() {
    // Job started
    this.queue.on('active', (job: Job<QueueJobData>) => {
      const jobId = job.data.jobId;
      this.updateJobStatus(jobId, 'running');
      console.log(`Job ${jobId} started processing`);
    });

    // Job completed
    this.queue.on('completed', (job: Job<QueueJobData>, result: any) => {
      const jobId = job.data.jobId;
      this.updateJobStatus(jobId, 'completed');
      console.log(`Job ${jobId} completed successfully`);
    });

    // Job failed
    this.queue.on('failed', (job: Job<QueueJobData>, error: Error) => {
      const jobId = job.data.jobId;
      this.updateJobStatus(jobId, 'failed');
      console.error(`Job ${jobId} failed:`, error.message);
    });

    // Job progress
    this.queue.on('progress', (job: Job<QueueJobData>, progress: number) => {
      const jobId = job.data.jobId;
      this.updateJobProgress(jobId, progress);
    });
  }

  private async processJob(job: Job<QueueJobData>): Promise<any> {
    const { jobId, files, config: jobConfig } = job.data;
    
    try {
      // Update progress
      await job.progress(0);
      
      // Get the processing job from our map
      const processingJob = this.jobs.get(jobId);
      if (!processingJob) {
        throw new Error(`Processing job ${jobId} not found`);
      }

      // Use the job processor service to handle the actual processing
      const result = await jobProcessorService.processJob(processingJob);
      
      // Update job with result
      processingJob.result = result;
      processingJob.updatedAt = new Date();
      
      return result;
      
    } catch (error) {
      console.error(`Job ${jobId} processing error:`, error);
      throw error;
    }
  }

  async addJob(jobData: QueueJobData, options: JobOptions = {}): Promise<Job<QueueJobData>> {
    const defaultOptions: JobOptions = {
      timeout: config.JOB_TIMEOUT,
      attempts: 3,
      ...options,
    };

    const bullJob = await this.queue.add(jobData, defaultOptions);
    
    // Create and store ProcessingJob
    const processingJob: ProcessingJob = {
      id: jobData.jobId,
      jobId: jobData.jobId, // Set jobId alias
      status: 'pending',
      input: {
        files: jobData.files,
        options: {},
      },
      config: jobData.config,
      progress: {
        currentStep: 'queued',
        stepsCompleted: 0,
        totalSteps: 4, // webcrack, babel, llm, prettier
        percentage: 0,
      },
      createdAt: new Date(jobData.metadata.createdAt),
      updatedAt: new Date(),
    };

    this.jobs.set(jobData.jobId, processingJob);
    return bullJob;
  }

  async getJob(jobId: string): Promise<ProcessingJob | undefined> {
    return this.jobs.get(jobId);
  }

  async getAllJobs(): Promise<ProcessingJob[]> {
    return Array.from(this.jobs.values());
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const bullJobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
      const job = bullJobs.find(j => j.data.jobId === jobId);
      
      if (job) {
        await job.remove();
        this.updateJobStatus(jobId, 'cancelled');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  private updateJobStatus(jobId: string, status: JobStatus) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
      }
    }
  }

  private updateJobProgress(jobId: string, percentage: number) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress.percentage = percentage;
      job.updatedAt = new Date();
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(), 
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async close() {
    await this.queue.close();
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService();