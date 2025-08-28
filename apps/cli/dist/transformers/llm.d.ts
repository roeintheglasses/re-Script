/**
 * LLM transformer for AI-powered variable/function renaming
 */
import { ProcessingStep, ProcessingInput, ProcessingOutput } from '../types.js';
import { BaseLLMProvider } from '../providers/base.js';
export interface LLMTransformOptions {
    chunkSize?: number;
    overlapRatio?: number;
    concurrency?: number;
    minConfidenceThreshold?: number;
    maxRetries?: number;
    timeout?: number;
}
export declare class LLMTransformer implements ProcessingStep {
    readonly name = "llm";
    readonly description = "AI-powered variable and function renaming";
    private provider;
    private options;
    constructor(provider: BaseLLMProvider, options?: LLMTransformOptions);
    /**
     * Execute LLM-powered renaming
     */
    execute(input: ProcessingInput): Promise<ProcessingOutput>;
    /**
     * Process code as a single chunk
     */
    private processSingleChunk;
    /**
     * Process large code by splitting into chunks
     */
    private processInChunks;
    /**
     * Split code into overlapping chunks
     */
    private splitIntoChunks;
    /**
     * Deduplicate suggestions by original name
     */
    private deduplicateSuggestions;
    /**
     * Apply renamings to code using AST-aware replacement
     */
    private applyRenamings;
    /**
     * Apply renamings using Babel AST traversal (safer approach)
     */
    private applyRenamingsWithAST;
    /**
     * Fallback: Apply renamings with safer regex that avoids common pitfalls
     */
    private applyRenamingsWithSafeRegex;
    /**
     * Basic check for obvious syntax errors that would be created by renaming
     */
    private hasObviousSyntaxErrors;
    /**
     * Escape string for regex
     */
    private escapeRegex;
    /**
     * Generate warnings about suggestions
     */
    private generateWarnings;
    /**
     * Get processing statistics
     */
    getStatistics(): {
        provider: string;
        model: string;
        requestCount: number;
        totalTokensUsed: number;
        averageConfidence: number;
    };
    /**
     * Update transformer options
     */
    updateOptions(options: Partial<LLMTransformOptions>): void;
    /**
     * Get current options
     */
    getOptions(): LLMTransformOptions;
    /**
     * Create LLM transformer from config
     */
    static fromConfig(input: ProcessingInput, options?: LLMTransformOptions): LLMTransformer;
}
//# sourceMappingURL=llm.d.ts.map