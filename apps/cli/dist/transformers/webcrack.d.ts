/**
 * Webcrack transformer for reverse bundling and deobfuscation
 */
import { ProcessingStep, ProcessingInput, ProcessingOutput } from '../types.js';
export interface WebcrackOptions {
    unpack?: boolean;
    deobfuscate?: boolean;
    unminify?: boolean;
    jsx?: boolean;
    timeout?: number;
    maxSize?: number;
}
export declare class WebcrackTransformer implements ProcessingStep {
    readonly name = "webcrack";
    readonly description = "Reverse bundling and deobfuscation using Webcrack";
    private options;
    constructor(options?: WebcrackOptions);
    /**
     * Execute webcrack transformation
     */
    execute(input: ProcessingInput): Promise<ProcessingOutput>;
    /**
     * Determine if code needs webcrack processing
     */
    private shouldProcess;
    /**
     * Check for many short variable names
     */
    private hasManyShortVars;
    /**
     * Check if code appears minified
     */
    private appearsMinified;
    /**
     * Execute operation with timeout
     */
    private executeWithTimeout;
    /**
     * Calculate improvement metrics
     */
    private calculateMetrics;
    /**
     * Count functions in code
     */
    private countFunctions;
    /**
     * Count variables in code
     */
    private countVariables;
    /**
     * Calculate complexity score
     */
    private calculateComplexity;
    /**
     * Calculate maximum brace nesting depth
     */
    private calculateMaxBraceDepth;
    /**
     * Update transformer options
     */
    updateOptions(options: Partial<WebcrackOptions>): void;
    /**
     * Get current options
     */
    getOptions(): WebcrackOptions;
}
//# sourceMappingURL=webcrack.d.ts.map