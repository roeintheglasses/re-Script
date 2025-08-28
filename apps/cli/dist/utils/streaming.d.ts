/**
 * Streaming processing utilities for large files
 */
import { Transform } from 'stream';
export interface StreamingOptions {
    chunkSize?: number;
    highWaterMark?: number;
    encoding?: BufferEncoding;
}
/**
 * Transform stream for code processing
 */
export declare class CodeProcessingStream extends Transform {
    private buffer;
    private processor;
    private chunkSize;
    constructor(processor: (chunk: string) => Promise<string>, options?: StreamingOptions);
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: unknown) => void): Promise<void>;
    _flush(callback: (error?: Error | null, data?: unknown) => void): Promise<void>;
    /**
     * Find a good break point in the code
     */
    private findBreakPoint;
}
/**
 * Progress tracking stream
 */
export declare class ProgressStream extends Transform {
    private bytesProcessed;
    private totalBytes;
    private onProgress;
    private lastEmit;
    constructor(totalBytes: number, onProgress: (progress: number) => void, options?: StreamingOptions);
    _transform(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null, data?: unknown) => void): void;
}
/**
 * Chunked file reader with memory management
 */
export declare class ChunkedFileReader {
    private filePath;
    private options;
    constructor(filePath: string, options?: StreamingOptions);
    /**
     * Process file in chunks with a transformer function
     */
    processInChunks(transformer: (chunk: string, index: number) => Promise<string>, onProgress?: (progress: number) => void): Promise<string[]>;
    /**
     * Stream file processing with backpressure handling
     */
    streamProcess(processor: (chunk: string) => Promise<string>, outputPath: string, onProgress?: (progress: number) => void): Promise<void>;
    /**
     * Get file size for progress calculation
     */
    private getFileSize;
    /**
     * Check if file should be processed with streaming
     */
    static shouldUseStreaming(fileSize: number, threshold?: number): boolean;
    /**
     * Estimate memory usage for streaming vs. loading entire file
     */
    static estimateMemoryUsage(fileSize: number, chunkSize?: number): {
        streaming: number;
        full: number;
        recommended: 'streaming' | 'full';
    };
}
/**
 * Memory-efficient string operations for large content
 */
export declare class StreamingStringOps {
    /**
     * Replace strings in large content without loading everything into memory
     */
    static replaceInStream(inputPath: string, outputPath: string, replacements: Array<{
        from: string;
        to: string;
    }>, options?: StreamingOptions): Promise<void>;
    /**
     * Count occurrences of patterns in large files
     */
    static countInStream(filePath: string, patterns: string[], options?: StreamingOptions): Promise<Record<string, number>>;
    /**
     * Extract all unique identifiers from large files
     */
    static extractIdentifiers(filePath: string, options?: StreamingOptions): Promise<Set<string>>;
    /**
     * Escape string for regex
     */
    private static escapeRegex;
}
/**
 * Factory function to create appropriate processor based on file size
 */
export declare function createOptimalProcessor(filePath: string, fileSize?: number): Promise<{
    type: 'streaming' | 'memory';
    processor: ChunkedFileReader | null;
    recommendation: string;
}>;
//# sourceMappingURL=streaming.d.ts.map