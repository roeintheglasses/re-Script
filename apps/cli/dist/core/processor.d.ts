/**
 * Main processor orchestrating the complete processing workflow
 */
import { ReScriptConfig, ProgressCallback, ProcessedFile, ProcessingSummary } from '../types.js';
export interface ProcessorOptions {
    outputDir?: string;
    preserveStructure?: boolean;
    generateBackups?: boolean;
    overwriteExisting?: boolean;
}
export declare class MainProcessor {
    private config;
    private options;
    private progressCallback?;
    constructor(config: ReScriptConfig, options?: ProcessorOptions);
    /**
     * Set progress callback
     */
    setProgressCallback(callback: ProgressCallback): void;
    /**
     * Process a single file
     */
    processFile(inputPath: string, outputPath?: string, jobId?: string): Promise<ProcessedFile>;
    /**
     * Process multiple files
     */
    processFiles(inputPaths: string[], outputDir?: string, jobId?: string): Promise<ProcessingSummary>;
    /**
     * Create processing pipeline
     */
    private createPipeline;
    /**
     * Generate output path
     */
    private generateOutputPath;
    /**
     * Create backup of original file
     */
    private createBackup;
    /**
     * Write output file
     */
    private writeOutput;
    /**
     * Emit progress event
     */
    private emitProgress;
    /**
     * Estimate functions in code
     */
    private estimateFunctions;
    /**
     * Estimate variables in code
     */
    private estimateVariables;
    /**
     * Estimate complexity
     */
    private estimateComplexity;
    /**
     * Update configuration
     */
    updateConfig(config: ReScriptConfig): void;
    /**
     * Update options
     */
    updateOptions(options: Partial<ProcessorOptions>): void;
}
//# sourceMappingURL=processor.d.ts.map