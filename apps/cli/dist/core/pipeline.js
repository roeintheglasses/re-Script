/**
 * Core processing pipeline orchestrator
 */
import { ReScriptError, ErrorRecoveryManager } from '../utils/errors.js';
import { createHash } from 'crypto';
export class ProcessingPipeline {
    steps = [];
    recoveryManager;
    progressCallback;
    constructor(recoveryManager) {
        this.recoveryManager = recoveryManager || new ErrorRecoveryManager();
    }
    /**
     * Add a processing step to the pipeline
     */
    addStep(step) {
        this.steps.push(step);
    }
    /**
     * Set progress callback for real-time updates
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    /**
     * Execute the complete pipeline for a single input
     */
    async execute(input, jobId) {
        const startTime = Date.now();
        let currentOutput = {
            code: input.code,
            metadata: input.metadata,
            success: true,
        };
        this.emitProgress('start', jobId, {
            currentStep: 'initialization',
            stepsCompleted: 0,
            totalSteps: this.steps.length,
            percentage: 0,
        });
        for (let i = 0; i < this.steps.length; i++) {
            const step = this.steps[i];
            const stepStartTime = Date.now();
            try {
                this.emitProgress('progress', jobId, {
                    currentStep: step.name,
                    stepsCompleted: i,
                    totalSteps: this.steps.length,
                    percentage: Math.round((i / this.steps.length) * 100),
                });
                // Create input for current step
                const stepInput = {
                    code: currentOutput.code,
                    metadata: {
                        ...currentOutput.metadata,
                        statistics: {
                            ...currentOutput.metadata.statistics,
                            tokensCount: this.estimateTokenCount(currentOutput.code),
                        },
                    },
                    config: input.config,
                };
                // Execute step
                const stepOutput = await step.execute(stepInput);
                if (!stepOutput.success && stepOutput.error) {
                    // Attempt recovery if step failed
                    if (stepOutput.error.recoverable) {
                        try {
                            const recoveredOutput = await this.attemptRecovery(stepOutput.error, stepInput, step);
                            currentOutput = recoveredOutput;
                            // Add warning about recovery
                            currentOutput.warnings = currentOutput.warnings || [];
                            currentOutput.warnings.push(`Step '${step.name}' failed but was recovered: ${stepOutput.error.message}`);
                        }
                        catch (recoveryError) {
                            // Recovery failed, propagate original error
                            throw stepOutput.error;
                        }
                    }
                    else {
                        // Non-recoverable error
                        throw stepOutput.error;
                    }
                }
                else {
                    // Step succeeded
                    currentOutput = stepOutput;
                }
                // Update metadata with step timing
                currentOutput.metadata.statistics = {
                    ...currentOutput.metadata.statistics,
                    tokensCount: this.estimateTokenCount(currentOutput.code),
                };
                console.log(`✓ Step '${step.name}' completed in ${Date.now() - stepStartTime}ms`);
            }
            catch (error) {
                const processingError = ReScriptError.fromError(error, step.name);
                this.emitProgress('error', jobId, undefined, processingError.toProcessingError());
                return {
                    code: currentOutput.code,
                    metadata: currentOutput.metadata,
                    success: false,
                    error: processingError.toProcessingError(),
                };
            }
        }
        this.emitProgress('complete', jobId, {
            currentStep: 'completed',
            stepsCompleted: this.steps.length,
            totalSteps: this.steps.length,
            percentage: 100,
        });
        console.log(`✅ Pipeline completed in ${Date.now() - startTime}ms`);
        return {
            ...currentOutput,
            success: true,
            metadata: {
                ...currentOutput.metadata,
                statistics: {
                    ...currentOutput.metadata.statistics,
                    tokensCount: this.estimateTokenCount(currentOutput.code),
                },
            },
        };
    }
    /**
     * Execute pipeline for multiple inputs in parallel
     */
    async executeParallel(inputs, concurrency = 5, jobId) {
        const results = new Array(inputs.length);
        let completed = 0;
        // Create semaphore for concurrency control
        const semaphore = new Semaphore(concurrency);
        const processInput = async (input, index) => {
            await semaphore.acquire();
            try {
                const result = await this.execute(input, jobId);
                results[index] = result;
                completed++;
                // Emit overall progress
                this.emitProgress('progress', jobId, {
                    currentStep: `Processing file ${index + 1}/${inputs.length}`,
                    stepsCompleted: completed,
                    totalSteps: inputs.length,
                    percentage: Math.round((completed / inputs.length) * 100),
                });
            }
            finally {
                semaphore.release();
            }
        };
        // Start all processing tasks
        const tasks = inputs.map((input, index) => processInput(input, index));
        // Wait for all to complete
        await Promise.all(tasks);
        return results;
    }
    /**
     * Attempt error recovery using recovery manager
     */
    async attemptRecovery(error, input, step) {
        console.warn(`⚠️  Attempting recovery for step '${step.name}': ${error.message}`);
        const recoveryResult = await this.recoveryManager.attemptRecovery(ReScriptError.fromError(error, step.name), { code: input.code });
        return {
            code: recoveryResult.code,
            metadata: input.metadata,
            success: true,
            warnings: [`Recovered from ${step.name} failure: ${error.message}`],
        };
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
     * Estimate token count for code
     */
    estimateTokenCount(code) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(code.length / 4);
    }
    /**
     * Get pipeline step names
     */
    getStepNames() {
        return this.steps.map(step => step.name);
    }
    /**
     * Clear all steps
     */
    clear() {
        this.steps = [];
    }
    /**
     * Create pipeline hash for caching
     */
    createPipelineHash(config) {
        const pipelineData = {
            steps: this.steps.map(step => step.name),
            config: {
                provider: config.provider,
                processing: config.processing,
            },
        };
        return createHash('sha256')
            .update(JSON.stringify(pipelineData))
            .digest('hex')
            .substring(0, 16);
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
/**
 * Pipeline builder for creating configured pipelines
 */
export class PipelineBuilder {
    pipeline;
    constructor() {
        this.pipeline = new ProcessingPipeline();
    }
    /**
     * Add webcrack step
     */
    addWebcrack(options) {
        import('../transformers/webcrack.js').then(({ WebcrackTransformer }) => {
            this.pipeline.addStep(new WebcrackTransformer(options));
        }).catch(console.error);
        return this;
    }
    /**
     * Add babel transformation step
     */
    addBabel(options) {
        import('../transformers/babel.js').then(({ BabelTransformer }) => {
            this.pipeline.addStep(new BabelTransformer(options));
        }).catch(console.error);
        return this;
    }
    /**
     * Add LLM processing step
     */
    addLLM(options) {
        // Note: LLM transformer needs to be created from input config
        // This will be added during pipeline execution
        console.log('LLM step will be added during execution based on configuration');
        return this;
    }
    /**
     * Add prettier formatting step
     */
    addPrettier(options) {
        import('../transformers/prettier.js').then(({ PrettierTransformer }) => {
            this.pipeline.addStep(new PrettierTransformer(options));
        }).catch(console.error);
        return this;
    }
    /**
     * Set progress callback
     */
    onProgress(callback) {
        this.pipeline.setProgressCallback(callback);
        return this;
    }
    /**
     * Build the configured pipeline
     */
    build() {
        return this.pipeline;
    }
    /**
     * Create standard pipeline with all steps
     */
    static createStandard() {
        return new PipelineBuilder()
            .addWebcrack()
            .addBabel()
            .addLLM()
            .addPrettier()
            .build();
    }
}
//# sourceMappingURL=pipeline.js.map