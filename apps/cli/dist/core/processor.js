/**
 * Main processor orchestrating the complete processing workflow
 */
import { PipelineBuilder } from './pipeline.js';
import { LLMTransformer } from '../transformers/llm.js';
import { ReScriptError, ErrorCode } from '../utils/errors.js';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { dirname, join, relative, extname } from 'path';
export class MainProcessor {
    config;
    options;
    progressCallback;
    constructor(config, options = {}) {
        this.config = config;
        this.options = {
            preserveStructure: true,
            generateBackups: true,
            overwriteExisting: false,
            ...options,
        };
    }
    /**
     * Set progress callback
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    /**
     * Process a single file
     */
    async processFile(inputPath, outputPath, jobId) {
        const startTime = Date.now();
        try {
            // Read input file
            const code = await readFile(inputPath, 'utf8');
            const fileStats = await stat(inputPath);
            // Generate output path if not provided
            if (!outputPath) {
                outputPath = this.generateOutputPath(inputPath);
            }
            // Create processing input
            const processingInput = {
                code,
                metadata: {
                    fileName: inputPath,
                    fileSize: fileStats.size,
                    statistics: {
                        linesOfCode: code.split('\n').length,
                        functionsCount: this.estimateFunctions(code),
                        variablesCount: this.estimateVariables(code),
                        complexityScore: this.estimateComplexity(code),
                        tokensCount: Math.ceil(code.length / 4),
                    },
                },
                config: this.config,
            };
            // Create and configure pipeline
            const pipeline = this.createPipeline();
            // Execute processing
            const result = await pipeline.execute(processingInput, jobId);
            if (!result.success) {
                throw new ReScriptError(ErrorCode.UNKNOWN_ERROR, `Processing failed: ${result.error?.message || 'Unknown error'}`, 'processing');
            }
            // Create backup if requested
            if (this.options.generateBackups && outputPath === inputPath) {
                await this.createBackup(inputPath);
            }
            // Write output
            await this.writeOutput(result.code, outputPath);
            const processingTime = Date.now() - startTime;
            return {
                inputPath,
                outputPath,
                success: true,
                statistics: result.metadata.statistics,
                processingTime,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            const processingError = ReScriptError.fromError(error, 'file-processing');
            return {
                inputPath,
                outputPath: outputPath || this.generateOutputPath(inputPath),
                success: false,
                error: processingError.toProcessingError(),
                statistics: {
                    linesOfCode: 0,
                    functionsCount: 0,
                    variablesCount: 0,
                    complexityScore: 0,
                    tokensCount: 0,
                },
                processingTime,
            };
        }
    }
    /**
     * Process multiple files
     */
    async processFiles(inputPaths, outputDir, jobId) {
        const startTime = Date.now();
        const results = [];
        // Process files with concurrency limit
        const concurrency = this.config.processing.concurrency;
        const semaphore = new Semaphore(concurrency);
        const processFile = async (inputPath, index) => {
            await semaphore.acquire();
            try {
                // Generate output path
                const outputPath = outputDir
                    ? this.generateOutputPath(inputPath, outputDir)
                    : this.generateOutputPath(inputPath);
                // Process file
                const result = await this.processFile(inputPath, outputPath, jobId);
                results[index] = result;
                // Emit progress
                this.emitProgress('progress', jobId, {
                    currentStep: `Processing ${relative(process.cwd(), inputPath)}`,
                    stepsCompleted: results.filter(r => r).length,
                    totalSteps: inputPaths.length,
                    percentage: Math.round((results.filter(r => r).length / inputPaths.length) * 100),
                    currentFile: inputPath,
                });
            }
            finally {
                semaphore.release();
            }
        };
        // Start processing all files
        const tasks = inputPaths.map((path, index) => processFile(path, index));
        await Promise.all(tasks);
        const totalProcessingTime = Date.now() - startTime;
        // Calculate summary
        const summary = {
            totalFiles: results.length,
            successfulFiles: results.filter(r => r.success).length,
            failedFiles: results.filter(r => !r.success).length,
            totalProcessingTime,
            tokensUsed: results.reduce((sum, r) => sum + (r.statistics?.tokensCount || 0), 0),
        };
        // Emit completion
        this.emitProgress('complete', jobId, {
            currentStep: 'completed',
            stepsCompleted: summary.totalFiles,
            totalSteps: summary.totalFiles,
            percentage: 100,
        });
        return summary;
    }
    /**
     * Create processing pipeline
     */
    createPipeline() {
        const builder = new PipelineBuilder();
        // Add steps based on configuration
        builder
            .addWebcrack({
            timeout: 30000,
            maxSize: 10 * 1024 * 1024,
        })
            .addBabel({
            timeout: 15000,
        });
        // Add LLM step manually since it needs config
        const pipeline = builder.build();
        // Create LLM transformer
        const llmTransformer = new (class {
            name = 'llm';
            description = 'AI-powered variable and function renaming';
            async execute(input) {
                const transformer = LLMTransformer.fromConfig(input, {
                    chunkSize: 10000,
                    concurrency: 3,
                    minConfidenceThreshold: 0.3,
                });
                return transformer.execute(input);
            }
        });
        pipeline.addStep(llmTransformer);
        // Add prettier step
        builder.addPrettier(this.config.output.prettierOptions);
        // Set progress callback
        if (this.progressCallback) {
            pipeline.setProgressCallback(this.progressCallback);
        }
        return pipeline;
    }
    /**
     * Generate output path
     */
    generateOutputPath(inputPath, outputDir) {
        if (outputDir) {
            if (this.options.preserveStructure) {
                // Preserve directory structure
                const relativePath = relative(process.cwd(), inputPath);
                return join(outputDir, relativePath);
            }
            else {
                // Flat structure
                const fileName = inputPath.split('/').pop();
                return join(outputDir, fileName);
            }
        }
        // Same directory, add suffix
        const ext = extname(inputPath);
        const base = inputPath.slice(0, -ext.length);
        return `${base}.readable${ext}`;
    }
    /**
     * Create backup of original file
     */
    async createBackup(filePath) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        const originalContent = await readFile(filePath, 'utf8');
        await writeFile(backupPath, originalContent, 'utf8');
        console.log(`📦 Created backup: ${backupPath}`);
    }
    /**
     * Write output file
     */
    async writeOutput(code, outputPath) {
        // Create directory if it doesn't exist
        const dir = dirname(outputPath);
        await mkdir(dir, { recursive: true });
        // Check if file exists and handle overwrite
        try {
            await stat(outputPath);
            if (!this.options.overwriteExisting) {
                throw new ReScriptError(ErrorCode.FILE_WRITE_ERROR, `Output file already exists: ${outputPath}`, 'file-output', false, ['Use --force to overwrite', 'Choose a different output path']);
            }
        }
        catch (error) {
            // File doesn't exist, which is fine
            if (error instanceof ReScriptError) {
                throw error;
            }
        }
        // Write the file
        await writeFile(outputPath, code, 'utf8');
        console.log(`📄 Output written: ${outputPath}`);
    }
    /**
     * Emit progress event
     */
    emitProgress(type, jobId, progress, error) {
        if (!this.progressCallback || !jobId)
            return;
        this.progressCallback({
            type,
            jobId,
            progress,
            error,
            timestamp: new Date(),
        });
    }
    /**
     * Estimate functions in code
     */
    estimateFunctions(code) {
        const patterns = [
            /function\s+\w+/g,
            /\w+\s*:\s*function/g,
            /=>\s*{/g,
        ];
        return patterns.reduce((count, pattern) => {
            return count + (code.match(pattern) || []).length;
        }, 0);
    }
    /**
     * Estimate variables in code
     */
    estimateVariables(code) {
        const patterns = [
            /\b(?:var|let|const)\s+\w+/g,
        ];
        return patterns.reduce((count, pattern) => {
            return count + (code.match(pattern) || []).length;
        }, 0);
    }
    /**
     * Estimate complexity
     */
    estimateComplexity(code) {
        const lines = code.split('\n').length;
        const functions = this.estimateFunctions(code);
        let complexity = 0;
        if (lines > 1000)
            complexity += 3;
        else if (lines > 500)
            complexity += 2;
        else if (lines > 100)
            complexity += 1;
        if (functions > 50)
            complexity += 2;
        else if (functions > 20)
            complexity += 1;
        return complexity;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = config;
    }
    /**
     * Update options
     */
    updateOptions(options) {
        this.options = { ...this.options, ...options };
    }
}
/**
 * Semaphore for concurrency control
 */
class Semaphore {
    permits;
    waiting = [];
    constructor(permits) {
        this.permits = permits;
    }
    async acquire() {
        if (this.permits > 0) {
            this.permits--;
            return;
        }
        return new Promise((resolve) => {
            this.waiting.push(resolve);
        });
    }
    release() {
        this.permits++;
        const next = this.waiting.shift();
        if (next) {
            this.permits--;
            next();
        }
    }
}
//# sourceMappingURL=processor.js.map