/**
 * Main process command implementation
 */
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
export declare function processCommand(input: string, options: ProcessOptions): Promise<void>;
export {};
//# sourceMappingURL=process.d.ts.map