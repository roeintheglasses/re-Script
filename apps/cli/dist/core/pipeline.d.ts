/**
 * Core processing pipeline orchestrator
 */
import { ProcessingStep, ProcessingInput, ProcessingOutput, ProgressCallback, ReScriptConfig } from '../types.js';
import { ErrorRecoveryManager } from '../utils/errors.js';
export declare class ProcessingPipeline {
    private steps;
    private recoveryManager;
    private progressCallback?;
    constructor(recoveryManager?: ErrorRecoveryManager);
    /**
     * Add a processing step to the pipeline
     */
    addStep(step: ProcessingStep): void;
    /**
     * Set progress callback for real-time updates
     */
    setProgressCallback(callback: ProgressCallback): void;
    /**
     * Execute the complete pipeline for a single input
     */
    execute(input: ProcessingInput, jobId?: string): Promise<ProcessingOutput>;
    /**
     * Execute pipeline for multiple inputs in parallel
     */
    executeParallel(inputs: ProcessingInput[], concurrency?: number, jobId?: string): Promise<ProcessingOutput[]>;
    /**
     * Attempt error recovery using recovery manager
     */
    private attemptRecovery;
    /**
     * Emit progress event
     */
    private emitProgress;
    /**
     * Estimate token count for code
     */
    private estimateTokenCount;
    /**
     * Get pipeline step names
     */
    getStepNames(): string[];
    /**
     * Clear all steps
     */
    clear(): void;
    /**
     * Create pipeline hash for caching
     */
    createPipelineHash(config: ReScriptConfig): string;
}
/**
 * Pipeline builder for creating configured pipelines
 */
export declare class PipelineBuilder {
    private pipeline;
    constructor();
    /**
     * Add webcrack step
     */
    addWebcrack(options?: import('../transformers/webcrack.js').WebcrackOptions): PipelineBuilder;
    /**
     * Add babel transformation step
     */
    addBabel(options?: import('../transformers/babel.js').BabelTransformOptions): PipelineBuilder;
    /**
     * Add LLM processing step
     */
    addLLM(options?: import('../transformers/llm.js').LLMTransformOptions): PipelineBuilder;
    /**
     * Add prettier formatting step
     */
    addPrettier(options?: import('../types.js').PrettierOptions): PipelineBuilder;
    /**
     * Set progress callback
     */
    onProgress(callback: ProgressCallback): PipelineBuilder;
    /**
     * Build the configured pipeline
     */
    build(): ProcessingPipeline;
    /**
     * Create standard pipeline with all steps
     */
    static createStandard(): ProcessingPipeline;
}
//# sourceMappingURL=pipeline.d.ts.map