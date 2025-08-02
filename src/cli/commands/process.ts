/**
 * Main process command implementation
 */

import { stat, access } from 'fs/promises';
import { extname, resolve } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

import { configLoader } from '../../config/loader.js';
import { FileNotFoundError, ReScriptError, ErrorCode } from '../../utils/errors.js';
import { validateCliOptions, CliOptions } from '../../config/schema.js';
import type { ReScriptConfig } from '../../types.js';

interface ProcessOptions {
  output?: string;
  config?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  concurrency?: number;
  recursive?: boolean;
  pattern?: string;
  exclude?: string[];
  dryRun?: boolean;
  watch?: boolean;
  force?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export async function processCommand(input: string, options: ProcessOptions): Promise<void> {
  const spinner = ora();
  
  try {
    // Validate CLI options
    const cliOptions: CliOptions = validateCliOptions({
      input,
      ...options,
    });

    if (!options.quiet) {
      console.log(chalk.blue('🔍 Initializing re-Script v2...\n'));
    }

    // Load configuration
    spinner.start('Loading configuration...');
    const config = await loadConfiguration(options.config, options);
    spinner.succeed('Configuration loaded');

    // Validate input and collect files
    spinner.start('Scanning input files...');
    const files = await collectInputFiles(input, cliOptions);
    spinner.succeed(`Found ${files.length} file(s) to process`);

    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  No files found to process'));
      return;
    }

    // Display processing summary
    if (!options.quiet) {
      displayProcessingSummary(files, config, cliOptions);
    }

    // Confirm processing in dry-run mode
    if (cliOptions.dryRun) {
      console.log(chalk.cyan('🔍 Dry run mode - no files will be modified'));
      return;
    }

    // Handle watch mode
    if (cliOptions.watch) {
      console.log(chalk.yellow('⚠️  Watch mode not implemented yet'));
      return;
    }

    // Process files using the main processor
    spinner.start('Processing files...');
    
    const { MainProcessor } = await import('../../core/processor.js');
    const processor = new MainProcessor(config, {
      outputDir: options.output || undefined,
      overwriteExisting: options.force || false,
      generateBackups: true,
    });

    // Set up progress callback
    const jobId = `job-${Date.now()}`;
    processor.setProgressCallback((event) => {
      if (event.type === 'progress' && event.progress) {
        spinner.text = `${event.progress.currentStep} (${event.progress.percentage}%)`;
      }
    });

    let summary;
    if (files.length === 1) {
      // Single file processing
      const result = await processor.processFile(files[0]!, options.output, jobId);
      summary = {
        totalFiles: 1,
        successfulFiles: result.success ? 1 : 0,
        failedFiles: result.success ? 0 : 1,
        totalProcessingTime: result.processingTime,
        tokensUsed: result.statistics?.tokensCount || 0,
      };
    } else {
      // Multiple files processing
      summary = await processor.processFiles(files, options.output, jobId);
    }

    spinner.succeed(`Processing completed: ${summary.successfulFiles}/${summary.totalFiles} files successful`);

    // Display detailed summary
    if (!options.quiet) {
      console.log(chalk.bold('\n📊 Processing Summary:'));
      console.log(`   Successful: ${chalk.green(summary.successfulFiles)}`);
      console.log(`   Failed: ${summary.failedFiles > 0 ? chalk.red(summary.failedFiles) : chalk.gray(summary.failedFiles)}`);
      console.log(`   Total time: ${chalk.cyan(Math.round(summary.totalProcessingTime / 1000))}s`);
      console.log(`   Tokens used: ${chalk.cyan(summary.tokensUsed.toLocaleString())}`);
      
      if (summary.cost) {
        console.log(`   Estimated cost: ${chalk.cyan(`$${summary.cost.toFixed(4)}`)}`);
      }

      if (summary.successfulFiles === summary.totalFiles) {
        console.log(chalk.green('\n✅ All files processed successfully!'));
      } else if (summary.failedFiles > 0) {
        console.log(chalk.yellow(`\n⚠️  ${summary.failedFiles} file(s) failed processing`));
      }
    }

  } catch (error) {
    spinner.fail('Processing failed');
    throw error;
  }
}

async function loadConfiguration(
  configPath: string | undefined,
  cliOptions: ProcessOptions
): Promise<ReScriptConfig> {
  try {
    const config = await configLoader.loadConfig(configPath);
    
    // Override with CLI options
    const cliOverride = configLoader.validateCliOverride(cliOptions as Record<string, unknown>);
    return { ...config, ...cliOverride } as ReScriptConfig;
    
  } catch (error) {
    if (error instanceof ReScriptError) {
      throw error;
    }
    throw new ReScriptError(
      ErrorCode.INVALID_CONFIG,
      `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      'config-loading'
    );
  }
}

async function collectInputFiles(input: string, options: CliOptions): Promise<string[]> {
  const inputPath = resolve(input);
  
  try {
    await access(inputPath);
  } catch {
    throw new FileNotFoundError(inputPath);
  }

  const stats = await stat(inputPath);
  
  if (stats.isFile()) {
    validateJavaScriptFile(inputPath);
    return [inputPath];
  }

  if (stats.isDirectory()) {
    return await collectDirectoryFiles(inputPath, options);
  }

  throw new ReScriptError(
    ErrorCode.INVALID_FILE_FORMAT,
    `Input path is neither a file nor directory: ${inputPath}`,
    'file-input'
  );
}

async function collectDirectoryFiles(dirPath: string, options: CliOptions): Promise<string[]> {
  const patterns = [];
  
  if (options.pattern) {
    patterns.push(options.pattern);
  } else {
    // Default patterns for JavaScript files
    patterns.push('**/*.js', '**/*.mjs', '**/*.cjs');
    if (!options.recursive) {
      patterns.splice(0, patterns.length, '*.js', '*.mjs', '*.cjs');
    }
  }

  const globOptions = {
    cwd: dirPath,
    absolute: true,
    ignore: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      ...((options.exclude || []).map(pattern => pattern.startsWith('!') ? pattern.slice(1) : pattern))
    ],
  };

  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, globOptions);
    files.push(...matches);
  }

  // Remove duplicates and validate files
  const uniqueFiles = [...new Set(files)];
  const validFiles = [];

  for (const file of uniqueFiles) {
    try {
      validateJavaScriptFile(file);
      validFiles.push(file);
    } catch (error) {
      if (options.verbose) {
        console.warn(chalk.yellow(`⚠️  Skipping ${file}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  }

  return validFiles;
}

function validateJavaScriptFile(filePath: string): void {
  const ext = extname(filePath).toLowerCase();
  const validExtensions = ['.js', '.mjs', '.cjs'];
  
  if (!validExtensions.includes(ext)) {
    throw new ReScriptError(
      ErrorCode.INVALID_FILE_FORMAT,
      `Unsupported file extension: ${ext}`,
      'file-validation'
    );
  }
}

function displayProcessingSummary(
  files: string[], 
  config: ReScriptConfig, 
  options: CliOptions
): void {
  console.log(chalk.bold('📋 Processing Summary:'));
  console.log(`   Provider: ${chalk.cyan(config.provider.name)} (${config.provider.model})`);
  console.log(`   Files: ${chalk.cyan(files.length)}`);
  console.log(`   Concurrency: ${chalk.cyan(config.processing.concurrency)}`);
  
  if (config.processing.caching.enabled) {
    console.log(`   Caching: ${chalk.green('enabled')} (${config.processing.caching.backend})`);
  } else {
    console.log(`   Caching: ${chalk.red('disabled')}`);
  }
  
  if (options.output) {
    console.log(`   Output: ${chalk.cyan(options.output)}`);
  }
  
  console.log();

  // Show first few files
  const displayFiles = files.slice(0, 5);
  console.log(chalk.bold('📁 Files to process:'));
  displayFiles.forEach(file => {
    console.log(`   ${chalk.gray('•')} ${file}`);
  });
  
  if (files.length > 5) {
    console.log(`   ${chalk.gray('•')} ... and ${files.length - 5} more`);
  }
  
  console.log();
}

// Watch mode implementation (placeholder for Phase 3)
async function _watchFiles(_files: string[], _config: ReScriptConfig): Promise<void> {
  console.log(chalk.blue('👀 Watching files for changes...'));
  console.log(chalk.gray('   Press Ctrl+C to stop'));
  
  // TODO: Implement file watching with chokidar in Phase 3
  // This is a placeholder for the watch functionality
  
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n📴 Stopping file watcher...'));
    process.exit(0);
  });
}