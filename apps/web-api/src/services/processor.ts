/**
 * Job processing service that integrates with the existing CLI
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { ProcessingJob, ProcessingResult, Config } from '@re-script/shared-types';
import { ProcessingError } from '@re-script/shared-utils';
import { eventStreamService } from '../routes/events.js';

export class JobProcessorService {
  private readonly CLI_PATH: string;
  private readonly OUTPUT_DIR: string;

  constructor() {
    // Path to the CLI executable
    this.CLI_PATH = join(process.cwd(), '..', 'cli', 'dist', 'cli', 'index.js');
    this.OUTPUT_DIR = join(process.cwd(), 'outputs');
  }

  async initialize(): Promise<void> {
    // Ensure output directory exists
    await mkdir(this.OUTPUT_DIR, { recursive: true });
  }

  async processJob(job: ProcessingJob): Promise<ProcessingResult> {
    try {
      // Update job status to running
      eventStreamService.broadcastJobUpdate(job.jobId, 'running', {
        stage: 'initializing',
        message: 'Starting job processing',
      });

      // Create output directory for this job
      const jobOutputDir = join(this.OUTPUT_DIR, job.jobId);
      await mkdir(jobOutputDir, { recursive: true });

      // Process each file
      const results: ProcessingResult[] = [];
      let totalFiles = job.input.files.length;
      let processedFiles = 0;

      for (const filePath of job.input.files) {
        try {
          eventStreamService.broadcastJobProgress(job.jobId, {
            stage: 'processing',
            currentFile: filePath,
            progress: Math.round((processedFiles / totalFiles) * 100),
            message: `Processing file: ${filePath}`,
          });

          const result = await this.processSingleFile(filePath, jobOutputDir, job.config);
          results.push(result);
          processedFiles++;

          eventStreamService.broadcastJobProgress(job.jobId, {
            stage: 'processing',
            currentFile: filePath,
            progress: Math.round((processedFiles / totalFiles) * 100),
            message: `Completed file: ${filePath}`,
          });

        } catch (error) {
          // Handle individual file errors but continue with other files
          const fileError = error instanceof ProcessingError ? error : 
            new ProcessingError(`Failed to process file: ${filePath}`, 'PROCESSING_ERROR');
          
          results.push({
            success: false,
            inputFile: filePath,
            error: fileError.message,
            processingTime: 0,
          });

          eventStreamService.broadcastJobProgress(job.jobId, {
            stage: 'error',
            currentFile: filePath,
            progress: Math.round((processedFiles / totalFiles) * 100),
            message: `Error processing file: ${filePath} - ${fileError.message}`,
          });
        }
      }

      // Calculate overall result
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      const overallResult: ProcessingResult = {
        success: successfulResults.length > 0,
        inputFile: job.input.files.length === 1 ? job.input.files[0] : `${job.input.files.length} files`,
        outputFile: successfulResults.length > 0 ? jobOutputDir : undefined,
        processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        statistics: {
          totalFiles: totalFiles,
          successfulFiles: successfulResults.length,
          failedFiles: failedResults.length,
          results: results,
        },
      };

      // Update job status based on results
      if (successfulResults.length === totalFiles) {
        eventStreamService.broadcastJobUpdate(job.jobId, 'completed', {
          stage: 'completed',
          message: `Successfully processed all ${totalFiles} files`,
          statistics: overallResult.statistics,
        });
      } else if (successfulResults.length > 0) {
        eventStreamService.broadcastJobUpdate(job.jobId, 'completed', {
          stage: 'partial_success',
          message: `Processed ${successfulResults.length}/${totalFiles} files successfully`,
          statistics: overallResult.statistics,
        });
      } else {
        eventStreamService.broadcastJobUpdate(job.jobId, 'failed', {
          stage: 'failed',
          message: 'Failed to process any files',
          statistics: overallResult.statistics,
        });
      }

      return overallResult;

    } catch (error) {
      const processingError = error instanceof ProcessingError ? error :
        new ProcessingError(`Job processing failed: ${error}`, 'PROCESSING_ERROR');

      eventStreamService.broadcastJobUpdate(job.jobId, 'failed', {
        stage: 'failed',
        message: processingError.message,
      });

      throw processingError;
    }
  }

  private async processSingleFile(
    inputFile: string,
    outputDir: string,
    config: Config
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // Build CLI command arguments
      const args = [
        this.CLI_PATH,
        'process',
        inputFile,
        '--output-dir', outputDir,
        '--provider', config.provider.name,
        '--model', config.provider.model,
        '--temperature', config.provider.temperature.toString(),
      ];

      // Add optional processing flags
      if (config.processing?.preserveComments) {
        args.push('--preserve-comments');
      }
      if (config.processing?.preserveSourceMaps) {
        args.push('--preserve-source-maps');
      }

      // Add output format
      args.push('--format', 'json');

      const childProcess = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Pass provider API keys from environment
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        const processingTime = Date.now() - startTime;

        if (code === 0) {
          try {
            // Try to parse JSON output from CLI
            const result = JSON.parse(stdout.trim());
            resolve({
              success: true,
              inputFile,
              outputFile: result.outputFile,
              processingTime,
              statistics: result.statistics,
            });
          } catch (parseError) {
            // Fallback if JSON parsing fails
            resolve({
              success: true,
              inputFile,
              outputFile: join(outputDir, `processed_${Date.now()}.js`),
              processingTime,
            });
          }
        } else {
          reject(new ProcessingError(
            `CLI process failed with code ${code}: ${stderr}`,
            'CLI_EXECUTION_ERROR'
          ));
        }
      });

      childProcess.on('error', (error) => {
        reject(new ProcessingError(
          `Failed to spawn CLI process: ${error.message}`,
          'CLI_SPAWN_ERROR'
        ));
      });

      // Set timeout for long-running processes (10 minutes)
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill();
          reject(new ProcessingError(
            'CLI process timed out after 10 minutes',
            'CLI_TIMEOUT_ERROR'
          ));
        }
      }, 10 * 60 * 1000);
    });
  }

  async getJobOutputs(jobId: string): Promise<string[]> {
    const jobOutputDir = join(this.OUTPUT_DIR, jobId);
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(jobOutputDir);
      return files.map(file => join(jobOutputDir, file));
    } catch (error) {
      return [];
    }
  }

  async getJobOutput(jobId: string, filename: string): Promise<string> {
    const outputPath = join(this.OUTPUT_DIR, jobId, filename);
    try {
      return await readFile(outputPath, 'utf-8');
    } catch (error) {
      throw new ProcessingError(
        `Failed to read output file: ${filename}`,
        'FILE_READ_ERROR'
      );
    }
  }
}

// Singleton instance
export const jobProcessorService = new JobProcessorService();