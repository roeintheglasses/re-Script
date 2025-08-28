/**
 * Prettier transformer for final code formatting
 */
import { ProcessingStep, ProcessingInput, ProcessingOutput, PrettierOptions } from '../types.js';
export declare class PrettierTransformer implements ProcessingStep {
    readonly name = "prettier";
    readonly description = "Code formatting using Prettier";
    private options;
    constructor(options?: PrettierOptions);
    /**
     * Execute Prettier formatting
     */
    execute(input: ProcessingInput): Promise<ProcessingOutput>;
    /**
     * Detect the best parser for the code
     */
    private detectParser;
    /**
     * Check if code contains TypeScript syntax
     */
    private hasTypeScriptSyntax;
    /**
     * Check if code contains JSX syntax
     */
    private hasJSXSyntax;
    /**
     * Format code with retry logic for different parsers
     */
    private formatWithRetry;
    /**
     * Calculate formatting metrics
     */
    private calculateMetrics;
    /**
     * Check if code is likely already formatted
     */
    private isAlreadyFormatted;
    /**
     * Get supported file extensions
     */
    getSupportedExtensions(): string[];
    /**
     * Validate Prettier options
     */
    validateOptions(options: PrettierOptions): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Update transformer options
     */
    updateOptions(options: Partial<PrettierOptions>): void;
    /**
     * Get current options
     */
    getOptions(): PrettierOptions;
    /**
     * Get Prettier version info
     */
    getVersionInfo(): Promise<{
        version: string;
        supportedLanguages: string[];
    }>;
}
//# sourceMappingURL=prettier.d.ts.map