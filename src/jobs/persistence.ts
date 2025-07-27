/**
 * Job persistence and resumability system
 */

import { writeFile, readFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { ReScriptError, ErrorCode } from '../utils/errors.js';
import { ProcessingJob, JobStatus, ProcessedFile, ReScriptConfig } from '../types.js';

export interface JobPersistenceConfig {
  enabled: boolean;
  storageDir: string;
  autoSaveInterval: number; // milliseconds
  maxStoredJobs: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  retentionDays: number;
}

export interface JobSnapshot {
  job: ProcessingJob;
  processedFiles: ProcessedFile[];
  checkpoint: JobCheckpoint;
  metadata: SnapshotMetadata;
}

export interface JobCheckpoint {
  currentFileIndex: number;
  completedFiles: string[];
  failedFiles: string[];
  pendingFiles: string[];
  resumeToken: string;
  lastSavedAt: Date;
  totalProgress: number;
}

export interface SnapshotMetadata {
  version: string;
  createdAt: Date;
  fileCount: number;
  dataSize: number;
  compression?: {
    algorithm: string;
    originalSize: number;
    compressedSize: number;
  };
  integrity: {
    checksum: string;
    algorithm: 'sha256';
  };
}

export interface JobRestoreResult {
  success: boolean;
  job?: ProcessingJob;
  processedFiles?: ProcessedFile[];
  checkpoint?: JobCheckpoint;
  error?: string;
  warnings?: string[];
}

export class JobPersistenceManager {
  private config: JobPersistenceConfig;
  private autoSaveTimers = new Map<string, NodeJS.Timeout>();
  private inMemorySnapshots = new Map<string, JobSnapshot>();

  constructor(config: JobPersistenceConfig) {
    this.config = {
      enabled: true,
      storageDir: '.rescript-jobs',
      autoSaveInterval: 30000, // 30 seconds
      maxStoredJobs: 100,
      compressionEnabled: false,
      encryptionEnabled: false,
      retentionDays: 30,
      ...config,
    };
  }

  /**
   * Initialize persistence storage
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      await mkdir(this.config.storageDir, { recursive: true });
      
      // Cleanup old jobs
      await this.cleanupOldJobs();
      
      // Verify storage integrity
      await this.verifyStorageIntegrity();
      
    } catch (error) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to initialize job persistence: ${error instanceof Error ? error.message : String(error)}`,
        'job-persistence-init'
      );
    }
  }

  /**
   * Save job snapshot
   */
  async saveJobSnapshot(
    job: ProcessingJob,
    processedFiles: ProcessedFile[] = [],
    checkpoint?: Partial<JobCheckpoint>
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const fullCheckpoint: JobCheckpoint = {
        currentFileIndex: processedFiles.length,
        completedFiles: processedFiles.filter(f => f.success).map(f => f.inputPath),
        failedFiles: processedFiles.filter(f => !f.success).map(f => f.inputPath),
        pendingFiles: job.input.files.slice(processedFiles.length),
        resumeToken: this.generateResumeToken(job.id),
        lastSavedAt: new Date(),
        totalProgress: Math.round((processedFiles.length / job.input.files.length) * 100),
        ...checkpoint,
      };

      const snapshot: JobSnapshot = {
        job: { ...job, updatedAt: new Date() },
        processedFiles,
        checkpoint: fullCheckpoint,
        metadata: await this.createSnapshotMetadata(job, processedFiles),
      };

      // Save to memory cache first
      this.inMemorySnapshots.set(job.id, snapshot);

      // Save to disk
      const filePath = this.getJobFilePath(job.id);
      await this.writeSnapshotToDisk(snapshot, filePath);

      // Setup auto-save if not already active
      this.setupAutoSave(job.id);

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to save job snapshot: ${error instanceof Error ? error.message : String(error)}`,
        'job-snapshot-save'
      );
    }
  }

  /**
   * Load job snapshot
   */
  async loadJobSnapshot(jobId: string): Promise<JobRestoreResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Job persistence is disabled' };
    }

    try {
      // Try memory cache first
      const memorySnapshot = this.inMemorySnapshots.get(jobId);
      if (memorySnapshot) {
        return {
          success: true,
          job: memorySnapshot.job,
          processedFiles: memorySnapshot.processedFiles,
          checkpoint: memorySnapshot.checkpoint,
        };
      }

      // Load from disk
      const filePath = this.getJobFilePath(jobId);
      const snapshot = await this.readSnapshotFromDisk(filePath);

      if (!snapshot) {
        return { success: false, error: `Job snapshot not found: ${jobId}` };
      }

      // Verify integrity
      const integrityCheck = await this.verifySnapshotIntegrity(snapshot);
      if (!integrityCheck.valid) {
        return { 
          success: false, 
          error: `Snapshot integrity check failed: ${integrityCheck.error}`,
          warnings: ['Job data may be corrupted']
        };
      }

      // Cache in memory
      this.inMemorySnapshots.set(jobId, snapshot);

      return {
        success: true,
        job: snapshot.job,
        processedFiles: snapshot.processedFiles,
        checkpoint: snapshot.checkpoint,
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Resume a job from checkpoint
   */
  async resumeJob(jobId: string, config: ReScriptConfig): Promise<{
    success: boolean;
    job?: ProcessingJob;
    remainingFiles?: string[];
    processedFiles?: ProcessedFile[];
    error?: string;
  }> {
    const restoreResult = await this.loadJobSnapshot(jobId);
    
    if (!restoreResult.success) {
      return { 
        success: false, 
        error: restoreResult.error || 'Failed to load job snapshot' 
      };
    }

    const { job, checkpoint, processedFiles } = restoreResult;
    
    if (!job || !checkpoint || !processedFiles) {
      return { success: false, error: 'Incomplete job data' };
    }

    // Validate that the job can be resumed
    const validation = await this.validateJobResumption(job, checkpoint);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Update job status and config
    const resumedJob: ProcessingJob = {
      ...job,
      status: 'running',
      config,
      updatedAt: new Date(),
    };

    return {
      success: true,
      job: resumedJob,
      remainingFiles: checkpoint.pendingFiles,
      processedFiles,
    };
  }

  /**
   * List all persisted jobs
   */
  async listPersistedJobs(): Promise<Array<{
    id: string;
    status: JobStatus;
    createdAt: Date;
    updatedAt: Date;
    progress: number;
    fileCount: number;
    canResume: boolean;
  }>> {
    if (!this.config.enabled) return [];

    try {
      const files = await readdir(this.config.storageDir);
      const jobFiles = files.filter(f => f.endsWith('.job.json'));
      
      const jobs = await Promise.all(
        jobFiles.map(async (file) => {
          try {
            const jobId = file.replace('.job.json', '');
            const snapshot = await this.readSnapshotFromDisk(
              join(this.config.storageDir, file)
            );
            
            if (!snapshot) return null;

            const validation = await this.validateJobResumption(
              snapshot.job, 
              snapshot.checkpoint
            );

            return {
              id: jobId,
              status: snapshot.job.status,
              createdAt: snapshot.job.createdAt,
              updatedAt: snapshot.job.updatedAt,
              progress: snapshot.checkpoint.totalProgress,
              fileCount: snapshot.job.input.files.length,
              canResume: validation.valid,
            };
          } catch {
            return null;
          }
        })
      );

      return jobs.filter(job => job !== null);

    } catch (error) {
      console.warn(`Failed to list persisted jobs: ${error}`);
      return [];
    }
  }

  /**
   * Delete job snapshot
   */
  async deleteJobSnapshot(jobId: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Remove from memory cache
      this.inMemorySnapshots.delete(jobId);

      // Clear auto-save timer
      const timer = this.autoSaveTimers.get(jobId);
      if (timer) {
        clearInterval(timer);
        this.autoSaveTimers.delete(jobId);
      }

      // Remove from disk
      const filePath = this.getJobFilePath(jobId);
      await unlink(filePath);

    } catch (error) {
      // Ignore file not found errors
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        throw new ReScriptError(
          ErrorCode.UNKNOWN_ERROR,
          `Failed to delete job snapshot: ${error.message}`,
          'job-snapshot-delete'
        );
      }
    }
  }

  /**
   * Clean up completed jobs and auto-save timers
   */
  async cleanup(): Promise<void> {
    // Clear all auto-save timers
    for (const timer of this.autoSaveTimers.values()) {
      clearInterval(timer);
    }
    this.autoSaveTimers.clear();

    // Clear memory cache
    this.inMemorySnapshots.clear();

    // Clean up old jobs if enabled
    if (this.config.enabled) {
      await this.cleanupOldJobs();
    }
  }

  /**
   * Get job file path
   */
  private getJobFilePath(jobId: string): string {
    return join(this.config.storageDir, `${jobId}.job.json`);
  }

  /**
   * Generate resume token
   */
  private generateResumeToken(jobId: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${jobId}-${timestamp}-${random}`;
  }

  /**
   * Create snapshot metadata
   */
  private async createSnapshotMetadata(
    job: ProcessingJob,
    processedFiles: ProcessedFile[]
  ): Promise<SnapshotMetadata> {
    const data = JSON.stringify({ job, processedFiles });
    const dataSize = Buffer.byteLength(data, 'utf8');
    
    // Calculate checksum
    const { createHash } = await import('crypto');
    const checksum = createHash('sha256').update(data).digest('hex');

    return {
      version: '2.0.0',
      createdAt: new Date(),
      fileCount: job.input.files.length,
      dataSize,
      integrity: {
        checksum,
        algorithm: 'sha256',
      },
    };
  }

  /**
   * Write snapshot to disk
   */
  private async writeSnapshotToDisk(snapshot: JobSnapshot, filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    
    let data = JSON.stringify(snapshot, null, 2);
    
    // Apply compression if enabled
    if (this.config.compressionEnabled) {
      const { gzip } = await import('zlib');
      const { promisify } = await import('util');
      const gzipAsync = promisify(gzip);
      
      const compressed = await gzipAsync(Buffer.from(data));
      data = compressed.toString('base64');
      
      // Update metadata with compression info
      snapshot.metadata.compression = {
        algorithm: 'gzip',
        originalSize: Buffer.byteLength(JSON.stringify(snapshot)),
        compressedSize: compressed.length,
      };
    }

    await writeFile(filePath, data, 'utf8');
  }

  /**
   * Read snapshot from disk
   */
  private async readSnapshotFromDisk(filePath: string): Promise<JobSnapshot | null> {
    try {
      let data = await readFile(filePath, 'utf8');
      
      // Parse JSON
      let parsed: JobSnapshot;
      try {
        parsed = JSON.parse(data);
      } catch {
        // Try decompression if direct parsing fails
        if (this.config.compressionEnabled) {
          const { gunzip } = await import('zlib');
          const { promisify } = await import('util');
          const gunzipAsync = promisify(gunzip);
          
          const decompressed = await gunzipAsync(Buffer.from(data, 'base64'));
          parsed = JSON.parse(decompressed.toString('utf8'));
        } else {
          throw new Error('Invalid JSON format');
        }
      }

      // Convert date strings back to Date objects
      parsed.job.createdAt = new Date(parsed.job.createdAt);
      parsed.job.updatedAt = new Date(parsed.job.updatedAt);
      if (parsed.job.completedAt) {
        parsed.job.completedAt = new Date(parsed.job.completedAt);
      }
      parsed.checkpoint.lastSavedAt = new Date(parsed.checkpoint.lastSavedAt);
      parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);

      return parsed;

    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verify snapshot integrity
   */
  private async verifySnapshotIntegrity(snapshot: JobSnapshot): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      // Verify checksum
      const data = JSON.stringify({
        job: snapshot.job,
        processedFiles: snapshot.processedFiles,
      });
      
      const { createHash } = await import('crypto');
      const checksum = createHash('sha256').update(data).digest('hex');

      if (checksum !== snapshot.metadata.integrity.checksum) {
        return { valid: false, error: 'Checksum mismatch' };
      }

      // Verify required fields
      if (!snapshot.job || !snapshot.checkpoint || !snapshot.metadata) {
        return { valid: false, error: 'Missing required snapshot data' };
      }

      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Validate job can be resumed
   */
  private async validateJobResumption(
    job: ProcessingJob,
    checkpoint: JobCheckpoint
  ): Promise<{ valid: boolean; error?: string }> {
    // Check if job is in a resumable state
    if (job.status === 'completed') {
      return { valid: false, error: 'Job is already completed' };
    }

    if (job.status === 'cancelled') {
      return { valid: false, error: 'Job was cancelled' };
    }

    // Check if there are pending files
    if (checkpoint.pendingFiles.length === 0) {
      return { valid: false, error: 'No pending files to process' };
    }

    // Verify files still exist
    const missingFiles: string[] = [];
    for (const filePath of checkpoint.pendingFiles) {
      try {
        await stat(filePath);
      } catch {
        missingFiles.push(filePath);
      }
    }

    if (missingFiles.length > 0) {
      return { 
        valid: false, 
        error: `Missing source files: ${missingFiles.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Setup auto-save for a job
   */
  private setupAutoSave(jobId: string): void {
    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(jobId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Setup new timer
    const timer = setInterval(async () => {
      const snapshot = this.inMemorySnapshots.get(jobId);
      if (snapshot && snapshot.job.status === 'running') {
        try {
          const filePath = this.getJobFilePath(jobId);
          await this.writeSnapshotToDisk(snapshot, filePath);
        } catch (error) {
          console.warn(`Auto-save failed for job ${jobId}: ${error}`);
        }
      } else {
        // Job is no longer running, clear the timer
        clearInterval(timer);
        this.autoSaveTimers.delete(jobId);
      }
    }, this.config.autoSaveInterval);

    this.autoSaveTimers.set(jobId, timer);
  }

  /**
   * Clean up old job snapshots
   */
  private async cleanupOldJobs(): Promise<void> {
    try {
      const files = await readdir(this.config.storageDir);
      const jobFiles = files.filter(f => f.endsWith('.job.json'));

      // Sort by modification time and keep only the most recent
      const fileStats = await Promise.all(
        jobFiles.map(async (file) => {
          const filePath = join(this.config.storageDir, file);
          const stats = await stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Delete old files beyond the limit
      const toDelete = fileStats.slice(this.config.maxStoredJobs);
      for (const { path } of toDelete) {
        await unlink(path);
      }

      // Delete files older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const { path, mtime } of fileStats) {
        if (mtime < cutoffDate) {
          await unlink(path);
        }
      }

    } catch (error) {
      console.warn(`Failed to cleanup old jobs: ${error}`);
    }
  }

  /**
   * Verify storage integrity
   */
  private async verifyStorageIntegrity(): Promise<void> {
    try {
      // Check if storage directory is writable
      const testFile = join(this.config.storageDir, '.test');
      await writeFile(testFile, 'test');
      await unlink(testFile);
    } catch (error) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        `Storage directory is not writable: ${this.config.storageDir}`,
        'storage-integrity'
      );
    }
  }
}

/**
 * Create job persistence manager from configuration
 */
export function createJobPersistenceManager(config: Partial<JobPersistenceConfig>): JobPersistenceManager {
  return new JobPersistenceManager(config as JobPersistenceConfig);
}