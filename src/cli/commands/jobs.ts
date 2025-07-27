/**
 * Job management CLI commands
 */

import chalk from 'chalk';
import ora from 'ora';
import { JobManager, createJobManager } from '../../jobs/index.js';
import { configLoader } from '../../config/loader.js';
import { JobStatus } from '../../types.js';

interface JobsOptions {
  config?: string;
  status?: string;
  limit?: number;
  format?: 'table' | 'json';
  verbose?: boolean;
}

interface JobResumeOptions {
  config?: string;
  force?: boolean;
  verbose?: boolean;
}

interface JobCancelOptions {
  force?: boolean;
  verbose?: boolean;
}

/**
 * List all jobs command
 */
export async function listJobsCommand(options: JobsOptions): Promise<void> {
  const spinner = ora('Loading jobs...').start();
  
  try {
    // Load configuration
    const config = await configLoader.loadConfig(options.config);
    
    // Create job manager
    const jobManager = createJobManager({
      persistence: {
        enabled: true,
        storageDir: '.rescript-jobs',
      },
    });
    
    await jobManager.initialize();
    
    // Build filter
    const filter: any = {};
    if (options.status) {
      const statusList = options.status.split(',') as JobStatus[];
      filter.status = statusList;
    }
    if (options.limit) {
      filter.limit = options.limit;
    }
    
    // Get jobs
    const jobs = await jobManager.listJobs(filter);
    
    spinner.succeed(`Found ${jobs.length} job(s)`);
    
    if (jobs.length === 0) {
      console.log(chalk.yellow('No jobs found'));
      return;
    }
    
    // Display jobs
    if (options.format === 'json') {
      console.log(JSON.stringify(jobs, null, 2));
    } else {
      displayJobsTable(jobs, options.verbose);
    }
    
    await jobManager.cleanup();
    
  } catch (error) {
    spinner.fail('Failed to list jobs');
    throw error;
  }
}

/**
 * Resume job command
 */
export async function resumeJobCommand(jobId: string, options: JobResumeOptions): Promise<void> {
  const spinner = ora(`Resuming job ${jobId}...`).start();
  
  try {
    // Load configuration
    const config = await configLoader.loadConfig(options.config);
    
    // Create job manager
    const jobManager = createJobManager({
      persistence: {
        enabled: true,
        storageDir: '.rescript-jobs',
      },
    });
    
    await jobManager.initialize();
    
    // Check if job exists and can be resumed
    const job = await jobManager.getJobStatus(jobId);
    if (!job) {
      spinner.fail(`Job not found: ${jobId}`);
      return;
    }
    
    if (job.status === 'completed') {
      spinner.fail('Job is already completed');
      return;
    }
    
    if (job.status === 'running') {
      spinner.fail('Job is already running');
      return;
    }
    
    if (job.status === 'cancelled' && !options.force) {
      spinner.fail('Job was cancelled (use --force to resume anyway)');
      return;
    }
    
    // Resume the job
    const success = await jobManager.resumeJob(jobId, config);
    
    if (success) {
      spinner.succeed(`Job ${jobId} resumed successfully`);
      
      if (options.verbose) {
        console.log(chalk.gray('Use `rescript jobs status <jobId>` to monitor progress'));
      }
    } else {
      spinner.fail(`Failed to resume job ${jobId}`);
    }
    
    // Keep manager running for a bit to start processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await jobManager.cleanup();
    
  } catch (error) {
    spinner.fail('Failed to resume job');
    throw error;
  }
}

/**
 * Cancel job command
 */
export async function cancelJobCommand(jobId: string, options: JobCancelOptions): Promise<void> {
  const spinner = ora(`Cancelling job ${jobId}...`).start();
  
  try {
    // Create job manager
    const jobManager = createJobManager({
      persistence: {
        enabled: true,
        storageDir: '.rescript-jobs',
      },
    });
    
    await jobManager.initialize();
    
    // Check if job exists
    const job = await jobManager.getJobStatus(jobId);
    if (!job) {
      spinner.fail(`Job not found: ${jobId}`);
      return;
    }
    
    if (job.status === 'completed') {
      spinner.warn('Job is already completed');
      return;
    }
    
    if (job.status === 'cancelled') {
      spinner.warn('Job is already cancelled');
      return;
    }
    
    // Cancel the job
    const success = await jobManager.cancelJob(jobId);
    
    if (success) {
      spinner.succeed(`Job ${jobId} cancelled successfully`);
    } else {
      spinner.fail(`Failed to cancel job ${jobId}`);
    }
    
    await jobManager.cleanup();
    
  } catch (error) {
    spinner.fail('Failed to cancel job');
    throw error;
  }
}

/**
 * Delete job command
 */
export async function deleteJobCommand(jobId: string, options: { force?: boolean }): Promise<void> {
  const spinner = ora(`Deleting job ${jobId}...`).start();
  
  try {
    // Create job manager
    const jobManager = createJobManager({
      persistence: {
        enabled: true,
        storageDir: '.rescript-jobs',
      },
    });
    
    await jobManager.initialize();
    
    // Check if job exists
    const job = await jobManager.getJobStatus(jobId);
    if (!job) {
      spinner.fail(`Job not found: ${jobId}`);
      return;
    }
    
    if (job.status === 'running' && !options.force) {
      spinner.fail('Cannot delete running job (use --force to cancel and delete)');
      return;
    }
    
    // Delete the job
    const success = await jobManager.deleteJob(jobId);
    
    if (success) {
      spinner.succeed(`Job ${jobId} deleted successfully`);
    } else {
      spinner.fail(`Failed to delete job ${jobId}`);
    }
    
    await jobManager.cleanup();
    
  } catch (error) {
    spinner.fail('Failed to delete job');
    throw error;
  }
}

/**
 * Get job status command
 */
export async function getJobStatusCommand(jobId: string, options: { verbose?: boolean }): Promise<void> {
  const spinner = ora(`Getting job status...`).start();
  
  try {
    // Create job manager
    const jobManager = createJobManager({
      persistence: {
        enabled: true,
        storageDir: '.rescript-jobs',
      },
    });
    
    await jobManager.initialize();
    
    // Get job status
    const job = await jobManager.getJobStatus(jobId);
    
    if (!job) {
      spinner.fail(`Job not found: ${jobId}`);
      return;
    }
    
    spinner.succeed('Job status retrieved');
    
    // Display job details
    displayJobDetails(job, options.verbose);
    
    await jobManager.cleanup();
    
  } catch (error) {
    spinner.fail('Failed to get job status');
    throw error;
  }
}

/**
 * Display jobs in table format
 */
function displayJobsTable(jobs: any[], verbose = false): void {
  console.log(chalk.bold('\n📋 Jobs List:'));
  console.log('─'.repeat(80));
  
  // Header
  const headers = ['ID', 'Status', 'Progress', 'Files', 'Created', 'Updated'];
  if (verbose) {
    headers.push('Config');
  }
  
  console.log(headers.map(h => chalk.cyan(h.padEnd(12))).join(' | '));
  console.log('─'.repeat(80));
  
  // Jobs
  for (const job of jobs) {
    const statusColor = getStatusColor(job.status);
    const progress = `${job.progress.percentage}%`;
    const fileCount = job.input.files.length;
    const created = formatDate(job.createdAt);
    const updated = formatDate(job.updatedAt);
    
    const row = [
      job.id.substring(0, 8) + '...',
      statusColor(job.status),
      progress.padEnd(12),
      fileCount.toString().padEnd(12),
      created,
      updated,
    ];
    
    if (verbose) {
      row.push(`${job.config.provider.name}/${job.config.provider.model}`.substring(0, 20));
    }
    
    console.log(row.join(' | '));
  }
  
  console.log('─'.repeat(80));
  console.log(chalk.gray(`Total: ${jobs.length} job(s)`));
}

/**
 * Display detailed job information
 */
function displayJobDetails(job: any, verbose = false): void {
  console.log(chalk.bold(`\n📄 Job Details: ${job.id}`));
  console.log('─'.repeat(50));
  
  const statusColor = getStatusColor(job.status);
  
  console.log(`Status: ${statusColor(job.status)}`);
  console.log(`Progress: ${job.progress.percentage}% (${job.progress.stepsCompleted}/${job.progress.totalSteps})`);
  console.log(`Current Step: ${job.progress.currentStep}`);
  console.log(`Files: ${job.input.files.length}`);
  console.log(`Created: ${formatDateTime(job.createdAt)}`);
  console.log(`Updated: ${formatDateTime(job.updatedAt)}`);
  
  if (job.completedAt) {
    console.log(`Completed: ${formatDateTime(job.completedAt)}`);
    
    if (job.output) {
      const { summary } = job.output;
      console.log(`\n📊 Summary:`);
      console.log(`  Successful: ${chalk.green(summary.successfulFiles)}`);
      console.log(`  Failed: ${summary.failedFiles > 0 ? chalk.red(summary.failedFiles) : chalk.gray(summary.failedFiles)}`);
      console.log(`  Processing Time: ${Math.round(summary.totalProcessingTime / 1000)}s`);
      console.log(`  Tokens Used: ${summary.tokensUsed.toLocaleString()}`);
      
      if (summary.cost) {
        console.log(`  Estimated Cost: $${summary.cost.toFixed(4)}`);
      }
    }
  }
  
  if (job.error) {
    console.log(`\n❌ Error:`);
    console.log(`  Code: ${job.error.code}`);
    console.log(`  Message: ${job.error.message}`);
    
    if (job.error.suggestions && job.error.suggestions.length > 0) {
      console.log(`  Suggestions:`);
      job.error.suggestions.forEach((suggestion: string) => {
        console.log(`    • ${suggestion}`);
      });
    }
  }
  
  if (verbose) {
    console.log(`\n⚙️  Configuration:`);
    console.log(`  Provider: ${job.config.provider.name}`);
    console.log(`  Model: ${job.config.provider.model}`);
    console.log(`  Temperature: ${job.config.provider.temperature}`);
    console.log(`  Max Tokens: ${job.config.provider.maxTokens}`);
    console.log(`  Concurrency: ${job.config.processing.concurrency}`);
    
    if (job.input.options.outputDir) {
      console.log(`  Output Dir: ${job.input.options.outputDir}`);
    }
    
    console.log(`\n📁 Input Files:`);
    job.input.files.slice(0, 10).forEach((file: string) => {
      console.log(`  • ${file}`);
    });
    
    if (job.input.files.length > 10) {
      console.log(`  ... and ${job.input.files.length - 10} more`);
    }
  }
}

/**
 * Get color function for job status
 */
function getStatusColor(status: JobStatus): (text: string) => string {
  switch (status) {
    case 'completed':
      return chalk.green;
    case 'running':
      return chalk.blue;
    case 'failed':
      return chalk.red;
    case 'cancelled':
      return chalk.yellow;
    case 'paused':
      return chalk.orange;
    default:
      return chalk.gray;
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString();
}

/**
 * Format date and time for display
 */
function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString();
}