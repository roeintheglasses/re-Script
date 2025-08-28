/**
 * Streaming processing utilities for large files
 */

import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform, Readable, Writable } from 'stream';
import { ReScriptError, ErrorCode } from './errors.js';

export interface StreamingOptions {
  chunkSize?: number;
  highWaterMark?: number;
  encoding?: BufferEncoding;
}

/**
 * Transform stream for code processing
 */
export class CodeProcessingStream extends Transform {
  private buffer: string = '';
  private processor: (chunk: string) => Promise<string>;
  private chunkSize: number;

  constructor(
    processor: (chunk: string) => Promise<string>,
    options: StreamingOptions = {}
  ) {
    super({
      objectMode: false,
      highWaterMark: options.highWaterMark || 64 * 1024, // 64KB
    });

    this.processor = processor;
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks
  }

  override async _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: unknown) => void
  ): Promise<void> {
    try {
      // Accumulate data in buffer
      this.buffer += chunk.toString('utf8');

      // Process complete chunks
      while (this.buffer.length >= this.chunkSize) {
        const chunkToProcess = this.buffer.slice(0, this.chunkSize);
        this.buffer = this.buffer.slice(this.chunkSize);

        // Find a good break point (end of line, semicolon, or brace)
        const breakPoint = this.findBreakPoint(chunkToProcess);
        if (breakPoint > 0 && breakPoint < chunkToProcess.length) {
          const actualChunk = chunkToProcess.slice(0, breakPoint);
          this.buffer = chunkToProcess.slice(breakPoint) + this.buffer;

          const processed = await this.processor(actualChunk);
          this.push(processed);
        } else {
          // No good break point, process as-is
          const processed = await this.processor(chunkToProcess);
          this.push(processed);
        }
      }

      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  override async _flush(callback: (error?: Error | null, data?: unknown) => void): Promise<void> {
    try {
      // Process remaining buffer
      if (this.buffer.length > 0) {
        const processed = await this.processor(this.buffer);
        this.push(processed);
      }
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find a good break point in the code
   */
  private findBreakPoint(chunk: string): number {
    const breakChars = ['\n', ';', '}', ')'];
    
    for (let i = chunk.length - 1; i >= chunk.length * 0.8; i--) {
      if (breakChars.includes(chunk[i]!)) {
        return i + 1;
      }
    }
    
    return chunk.length;
  }
}

/**
 * Progress tracking stream
 */
export class ProgressStream extends Transform {
  private bytesProcessed = 0;
  private totalBytes: number;
  private onProgress: (progress: number) => void;
  private lastEmit = 0;

  constructor(
    totalBytes: number,
    onProgress: (progress: number) => void,
    options: StreamingOptions = {}
  ) {
    super({
      objectMode: false,
      highWaterMark: options.highWaterMark || 64 * 1024,
    });

    this.totalBytes = totalBytes;
    this.onProgress = onProgress;
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: unknown) => void
  ): void {
    this.bytesProcessed += chunk.length;
    
    // Emit progress every 1% or every second
    const progress = (this.bytesProcessed / this.totalBytes) * 100;
    const now = Date.now();
    
    if (progress - this.lastEmit >= 1 || now - this.lastEmit >= 1000) {
      this.onProgress(Math.min(progress, 100));
      this.lastEmit = progress;
    }

    this.push(chunk);
    callback();
  }
}

/**
 * Chunked file reader with memory management
 */
export class ChunkedFileReader {
  private filePath: string;
  private options: StreamingOptions;

  constructor(filePath: string, options: StreamingOptions = {}) {
    this.filePath = filePath;
    this.options = {
      chunkSize: 1024 * 1024, // 1MB default
      highWaterMark: 64 * 1024, // 64KB buffer
      encoding: 'utf8',
      ...options,
    };
  }

  /**
   * Process file in chunks with a transformer function
   */
  async processInChunks(
    transformer: (chunk: string, index: number) => Promise<string>,
    onProgress?: (progress: number) => void
  ): Promise<string[]> {
    const results: string[] = [];
    let chunkIndex = 0;

    try {
      const stream = createReadStream(this.filePath, {
        encoding: this.options.encoding,
        highWaterMark: this.options.highWaterMark,
      });

      let buffer = '';
      let totalBytesRead = 0;
      const fileSize = await this.getFileSize();

      for await (const chunk of stream) {
        buffer += chunk;
        totalBytesRead += Buffer.byteLength(chunk, this.options.encoding);

        // Process complete chunks
        while (buffer.length >= this.options.chunkSize!) {
          const chunkToProcess = buffer.slice(0, this.options.chunkSize!);
          buffer = buffer.slice(this.options.chunkSize!);

          const processed = await transformer(chunkToProcess, chunkIndex++);
          results.push(processed);

          // Report progress
          if (onProgress) {
            const progress = (totalBytesRead / fileSize) * 100;
            onProgress(Math.min(progress, 100));
          }
        }
      }

      // Process remaining buffer
      if (buffer.length > 0) {
        const processed = await transformer(buffer, chunkIndex);
        results.push(processed);
      }

      if (onProgress) {
        onProgress(100);
      }

      return results;

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.FILE_READ_ERROR,
        `Failed to process file in chunks: ${error instanceof Error ? error.message : String(error)}`,
        'streaming-read'
      );
    }
  }

  /**
   * Stream file processing with backpressure handling
   */
  async streamProcess(
    processor: (chunk: string) => Promise<string>,
    outputPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const fileSize = await this.getFileSize();
      const inputStream = createReadStream(this.filePath, {
        encoding: this.options.encoding,
        highWaterMark: this.options.highWaterMark,
      });

      const outputStream = createWriteStream(outputPath, {
        encoding: this.options.encoding,
      });

      const transforms: Transform[] = [];

      // Add progress tracking if requested
      if (onProgress) {
        transforms.push(new ProgressStream(fileSize, onProgress));
      }

      // Add code processing transform
      transforms.push(new CodeProcessingStream(processor, this.options));

      // Create pipeline with all transforms
      const streams = [inputStream, ...transforms, outputStream];
      
      await pipeline(streams);

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.FILE_WRITE_ERROR,
        `Failed to stream process file: ${error instanceof Error ? error.message : String(error)}`,
        'streaming-process'
      );
    }
  }

  /**
   * Get file size for progress calculation
   */
  private async getFileSize(): Promise<number> {
    try {
      const { stat } = await import('fs/promises');
      const stats = await stat(this.filePath);
      return stats.size;
    } catch (error) {
      throw new ReScriptError(
        ErrorCode.FILE_READ_ERROR,
        `Failed to get file size: ${error instanceof Error ? error.message : String(error)}`,
        'file-stat'
      );
    }
  }

  /**
   * Check if file should be processed with streaming
   */
  static shouldUseStreaming(fileSize: number, threshold = 10 * 1024 * 1024): boolean {
    return fileSize > threshold; // 10MB threshold
  }

  /**
   * Estimate memory usage for streaming vs. loading entire file
   */
  static estimateMemoryUsage(fileSize: number, chunkSize = 1024 * 1024): {
    streaming: number;
    full: number;
    recommended: 'streaming' | 'full';
  } {
    const streamingMemory = chunkSize * 2; // Buffer + processing overhead
    const fullMemory = fileSize * 3; // Original + processed + overhead

    return {
      streaming: streamingMemory,
      full: fullMemory,
      recommended: streamingMemory < fullMemory / 4 ? 'streaming' : 'full',
    };
  }
}

/**
 * Memory-efficient string operations for large content
 */
export class StreamingStringOps {
  /**
   * Replace strings in large content without loading everything into memory
   */
  static async replaceInStream(
    inputPath: string,
    outputPath: string,
    replacements: Array<{ from: string; to: string }>,
    options: StreamingOptions = {}
  ): Promise<void> {
    const processor = async (chunk: string): Promise<string> => {
      let result = chunk;
      
      for (const { from, to } of replacements) {
        // Use word boundary regex for safe replacement
        const regex = new RegExp(`\\b${this.escapeRegex(from)}\\b`, 'g');
        result = result.replace(regex, to);
      }
      
      return result;
    };

    const reader = new ChunkedFileReader(inputPath, options);
    await reader.streamProcess(processor, outputPath);
  }

  /**
   * Count occurrences of patterns in large files
   */
  static async countInStream(
    filePath: string,
    patterns: string[],
    options: StreamingOptions = {}
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    patterns.forEach(pattern => counts[pattern] = 0);

    const reader = new ChunkedFileReader(filePath, options);
    
    await reader.processInChunks(async (chunk: string) => {
      for (const pattern of patterns) {
        const regex = new RegExp(`\\b${this.escapeRegex(pattern)}\\b`, 'g');
        const matches = chunk.match(regex);
        if (matches) {
          counts[pattern] += matches.length;
        }
      }
      return chunk; // Return unchanged
    });

    return counts;
  }

  /**
   * Extract all unique identifiers from large files
   */
  static async extractIdentifiers(
    filePath: string,
    options: StreamingOptions = {}
  ): Promise<Set<string>> {
    const identifiers = new Set<string>();
    const identifierRegex = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;

    const reader = new ChunkedFileReader(filePath, options);
    
    await reader.processInChunks(async (chunk: string) => {
      const matches = chunk.match(identifierRegex);
      if (matches) {
        matches.forEach(match => identifiers.add(match));
      }
      return chunk;
    });

    return identifiers;
  }

  /**
   * Escape string for regex
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Factory function to create appropriate processor based on file size
 */
export async function createOptimalProcessor(
  filePath: string,
  fileSize?: number
): Promise<{
  type: 'streaming' | 'memory';
  processor: ChunkedFileReader | null;
  recommendation: string;
}> {
  if (!fileSize) {
    const { stat } = await import('fs/promises');
    const stats = await stat(filePath);
    fileSize = stats.size;
  }

  const memoryEstimate = ChunkedFileReader.estimateMemoryUsage(fileSize);
  const useStreaming = ChunkedFileReader.shouldUseStreaming(fileSize);

  if (useStreaming) {
    return {
      type: 'streaming',
      processor: new ChunkedFileReader(filePath),
      recommendation: `File is ${Math.round(fileSize / 1024 / 1024)}MB, using streaming to conserve memory`,
    };
  } else {
    return {
      type: 'memory',
      processor: null,
      recommendation: `File is ${Math.round(fileSize / 1024)}KB, loading entirely into memory for faster processing`,
    };
  }
}