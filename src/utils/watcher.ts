/**
 * File watching system for real-time processing
 */

import { watch, FSWatcher } from 'chokidar';
import { stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { ReScriptConfig } from '../types.js';
import { MainProcessor } from '../core/processor.js';
import { ReScriptError, ErrorCode } from './errors.js';
import chalk from 'chalk';

export interface WatcherOptions {
  patterns: string[];
  ignored?: string[];
  debounceMs?: number;
  batchMs?: number;
  recursive?: boolean;
  outputDir?: string;
  force?: boolean;
}

export interface WatcherStats {
  filesWatched: number;
  totalProcessed: number;
  successfulProcessed: number;
  failedProcessed: number;
  startTime: Date;
  lastProcessed?: Date;
}

export class FileWatcher {
  private config: ReScriptConfig;
  private options: WatcherOptions;
  private processor: MainProcessor;
  private watcher?: FSWatcher;
  private isRunning = false;
  private stats: WatcherStats;
  private pendingFiles = new Map<string, NodeJS.Timeout>();
  private batchTimer?: NodeJS.Timeout;
  private batchedFiles = new Set<string>();

  constructor(config: ReScriptConfig, options: WatcherOptions) {
    this.config = config;
    this.options = {
      debounceMs: 500,
      batchMs: 1000,
      recursive: true,
      force: false,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.backup.*',
        '**/*.readable.*',
        ...((options.ignored || []))
      ],
      ...options,
    };

    this.processor = new MainProcessor(config, {
      outputDir: options.outputDir,
      overwriteExisting: options.force,
      generateBackups: true,
    });

    this.stats = {
      filesWatched: 0,
      totalProcessed: 0,
      successfulProcessed: 0,
      failedProcessed: 0,
      startTime: new Date(),
    };
  }

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        'Watcher is already running',
        'watcher-start'
      );
    }

    try {
      console.log(chalk.blue('👀 Starting file watcher...'));
      
      // Create chokidar watcher
      this.watcher = watch(this.options.patterns, {
        ignored: this.options.ignored,
        ignoreInitial: true,
        persistent: true,
        followSymlinks: false,
        usePolling: false,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for watcher to be ready
      await new Promise<void>((resolve) => {
        this.watcher!.on('ready', () => {
          const watchedPaths = this.watcher!.getWatched();
          this.stats.filesWatched = Object.values(watchedPaths)
            .reduce((total, files) => total + files.length, 0);
          
          console.log(chalk.green(`✅ Watching ${this.stats.filesWatched} files`));
          console.log(chalk.gray('   Press Ctrl+C to stop'));
          resolve();
        });
      });

      this.isRunning = true;

      // Set up graceful shutdown
      this.setupShutdownHandlers();

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to start watcher: ${error instanceof Error ? error.message : String(error)}`,
        'watcher-start'
      );
    }
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log(chalk.yellow('\n📴 Stopping file watcher...'));

    // Clear any pending timers
    for (const timer of this.pendingFiles.values()) {
      clearTimeout(timer);
    }
    this.pendingFiles.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Close watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = undefined;
    }

    this.isRunning = false;
    this.displayStats();
    console.log(chalk.green('✅ Watcher stopped'));
  }

  /**
   * Set up file change event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange(filePath, 'modified');
    });

    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange(filePath, 'added');
    });

    this.watcher.on('error', (error: Error) => {
      console.error(chalk.red(`❌ Watcher error: ${error.message}`));
    });
  }

  /**
   * Handle file change events with debouncing
   */
  private async handleFileChange(filePath: string, changeType: 'modified' | 'added'): Promise<void> {
    try {
      // Validate file
      if (!this.shouldProcessFile(filePath)) {
        return;
      }

      // Clear existing timer for this file
      const existingTimer = this.pendingFiles.get(filePath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set up debounced processing
      const timer = setTimeout(() => {
        this.pendingFiles.delete(filePath);
        this.addToBatch(filePath, changeType);
      }, this.options.debounceMs);

      this.pendingFiles.set(filePath, timer);

    } catch (error) {
      console.error(chalk.red(`❌ Error handling file change: ${error}`));
    }
  }

  /**
   * Add file to batch for processing
   */
  private addToBatch(filePath: string, changeType: 'modified' | 'added'): void {
    this.batchedFiles.add(filePath);

    // Display immediate feedback
    const relativePath = relative(process.cwd(), filePath);
    const icon = changeType === 'added' ? '📁' : '📝';
    console.log(chalk.cyan(`${icon} ${changeType}: ${relativePath}`));

    // Clear existing batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set up batch processing timer
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.options.batchMs);
  }

  /**
   * Process all files in the current batch
   */
  private async processBatch(): Promise<void> {
    if (this.batchedFiles.size === 0) return;

    const filesToProcess = Array.from(this.batchedFiles);
    this.batchedFiles.clear();

    console.log(chalk.blue(`\n🔄 Processing ${filesToProcess.length} file(s)...`));

    try {
      const jobId = `watch-${Date.now()}`;
      const summary = await this.processor.processFiles(filesToProcess, this.options.outputDir, jobId);

      // Update statistics
      this.stats.totalProcessed += summary.totalFiles;
      this.stats.successfulProcessed += summary.successfulFiles;
      this.stats.failedProcessed += summary.failedFiles;
      this.stats.lastProcessed = new Date();

      // Display results
      if (summary.successfulFiles === summary.totalFiles) {
        console.log(chalk.green(`✅ Successfully processed ${summary.totalFiles} file(s)`));
      } else {
        console.log(chalk.yellow(`⚠️  Processed ${summary.successfulFiles}/${summary.totalFiles} file(s)`));
      }

      if (summary.tokensUsed > 0) {
        console.log(chalk.gray(`   Tokens used: ${summary.tokensUsed.toLocaleString()}`));
      }

    } catch (error) {
      this.stats.failedProcessed += filesToProcess.length;
      console.error(chalk.red(`❌ Batch processing failed: ${error instanceof Error ? error.message : String(error)}`));
    }

    console.log(chalk.gray(`   Watching for changes...\n`));
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    // Check file extension
    const ext = extname(filePath).toLowerCase();
    const supportedExtensions = ['.js', '.mjs', '.cjs'];
    
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // Check if it's a generated file (to avoid processing our own outputs)
    const fileName = filePath.toLowerCase();
    if (fileName.includes('.readable.') || 
        fileName.includes('.backup.') ||
        fileName.includes('.min.') && fileName.includes('.readable.')) {
      return false;
    }

    return true;
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGUSR2', shutdown); // For nodemon
  }

  /**
   * Display watcher statistics
   */
  private displayStats(): void {
    const runtime = Date.now() - this.stats.startTime.getTime();
    const runtimeMinutes = Math.round(runtime / 60000);

    console.log(chalk.bold('\n📊 Watch Session Statistics:'));
    console.log(`   Runtime: ${runtimeMinutes} minute(s)`);
    console.log(`   Files watched: ${this.stats.filesWatched}`);
    console.log(`   Files processed: ${this.stats.totalProcessed}`);
    console.log(`   Successful: ${chalk.green(this.stats.successfulProcessed)}`);
    console.log(`   Failed: ${this.stats.failedProcessed > 0 ? chalk.red(this.stats.failedProcessed) : chalk.gray(this.stats.failedProcessed)}`);

    if (this.stats.lastProcessed) {
      console.log(`   Last processed: ${this.stats.lastProcessed.toLocaleTimeString()}`);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * Check if watcher is running
   */
  isWatching(): boolean {
    return this.isRunning;
  }

  /**
   * Get list of watched files
   */
  getWatchedFiles(): string[] {
    if (!this.watcher) return [];

    const watchedPaths = this.watcher.getWatched();
    const files: string[] = [];

    for (const [dir, fileNames] of Object.entries(watchedPaths)) {
      for (const fileName of fileNames) {
        files.push(join(dir, fileName));
      }
    }

    return files;
  }

  /**
   * Add new patterns to watch
   */
  addPatterns(patterns: string[]): void {
    if (!this.watcher) return;

    for (const pattern of patterns) {
      this.watcher.add(pattern);
    }
  }

  /**
   * Remove patterns from watching
   */
  removePatterns(patterns: string[]): void {
    if (!this.watcher) return;

    for (const pattern of patterns) {
      this.watcher.unwatch(pattern);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: ReScriptConfig): void {
    this.config = config;
    this.processor.updateConfig(config);
  }
}

/**
 * Utility function to create and start a file watcher
 */
export async function createWatcher(
  config: ReScriptConfig,
  options: WatcherOptions
): Promise<FileWatcher> {
  const watcher = new FileWatcher(config, options);
  await watcher.start();
  return watcher;
}