/**
 * Babel transformer for AST-based code improvements
 */
import { ProcessingStep, ProcessingInput, ProcessingOutput } from '../types.js';
export interface BabelTransformOptions {
    enableBeautifier?: boolean;
    convertVoidToUndefined?: boolean;
    flipComparisons?: boolean;
    expandNumberLiterals?: boolean;
    removeUnnecessaryParens?: boolean;
    simplifyBooleanExpressions?: boolean;
    timeout?: number;
}
export declare class BabelTransformer implements ProcessingStep {
    readonly name = "babel";
    readonly description = "AST-based code transformations using Babel";
    private options;
    constructor(options?: BabelTransformOptions);
    /**
     * Execute Babel transformations
     */
    execute(input: ProcessingInput): Promise<ProcessingOutput>;
    /**
     * Transform code using Babel
     */
    private transformCode;
    /**
     * Build plugins list based on options
     */
    private buildPluginsList;
    /**
     * Plugin to convert void 0 to undefined
     */
    private createVoidToUndefinedPlugin;
    /**
     * Plugin to flip literal-first comparisons
     */
    private createFlipComparisonsPlugin;
    /**
     * Plugin to expand scientific notation numbers
     */
    private createExpandNumbersPlugin;
    /**
     * Plugin to remove unnecessary parentheses
     */
    private createRemoveParensPlugin;
    /**
     * Plugin to simplify boolean expressions
     */
    private createSimplifyBooleansPlugin;
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
    updateOptions(options: Partial<BabelTransformOptions>): void;
    /**
     * Get current options
     */
    getOptions(): BabelTransformOptions;
}
//# sourceMappingURL=babel.d.ts.map