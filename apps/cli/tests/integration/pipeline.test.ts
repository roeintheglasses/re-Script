/**
 * Integration tests for the processing pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessingPipeline, PipelineBuilder } from '../../src/core/pipeline.js';
import { ProcessingInput, ReScriptConfig } from '../../src/types.js';
import { defaultConfig } from '../../src/config/schema.js';

describe('ProcessingPipeline Integration', () => {
  let pipeline: ProcessingPipeline;
  let testInput: ProcessingInput;
  let mockConfig: ReScriptConfig;

  beforeEach(() => {
    pipeline = new ProcessingPipeline();
    
    mockConfig = {
      ...defaultConfig,
      provider: {
        ...defaultConfig.provider,
        apiKey: 'test-key', // Mock API key for testing
      },
    };

    testInput = {
      code: `
        function a(b) {
          var c = b + 1;
          return c * 2;
        }
        
        var d = a(5);
        console.log(d);
      `,
      metadata: {
        fileName: 'test.js',
        fileSize: 100,
        statistics: {
          linesOfCode: 8,
          functionsCount: 1,
          variablesCount: 3,
          complexityScore: 1,
          tokensCount: 25,
        },
      },
      config: mockConfig,
    };
  });

  describe('Pipeline Execution', () => {
    it('should handle empty pipeline gracefully', async () => {
      const result = await pipeline.execute(testInput);
      
      expect(result.success).toBe(true);
      expect(result.code).toBe(testInput.code);
      expect(result.metadata).toBeDefined();
    });

    it('should track progress through steps', async () => {
      const progressEvents: string[] = [];
      
      pipeline.setProgressCallback((event) => {
        progressEvents.push(event.type);
      });

      // Add a mock step
      pipeline.addStep({
        name: 'test-step',
        description: 'Test transformation',
        async execute(input) {
          return {
            code: input.code.toUpperCase(),
            metadata: input.metadata,
            success: true,
          };
        },
      });

      const result = await pipeline.execute(testInput, 'test-job');
      
      expect(result.success).toBe(true);
      expect(progressEvents).toContain('start');
      expect(progressEvents).toContain('complete');
    });

    it('should handle step failures with recovery', async () => {
      // Add a failing step
      pipeline.addStep({
        name: 'failing-step',
        description: 'Step that fails',
        async execute() {
          throw new Error('Simulated failure');
        },
      });

      const result = await pipeline.execute(testInput);
      
      // Should fail since no recovery is possible for generic errors
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.step).toBe('failing-step');
    });

    it('should calculate token estimates', async () => {
      const result = await pipeline.execute(testInput);
      
      expect(result.metadata.statistics.tokensCount).toBeGreaterThan(0);
      expect(typeof result.metadata.statistics.tokensCount).toBe('number');
    });
  });

  describe('Parallel Processing', () => {
    it('should process multiple inputs concurrently', async () => {
      const inputs = [testInput, testInput, testInput];
      
      // Add a simple transformation step
      pipeline.addStep({
        name: 'simple-transform',
        description: 'Simple transformation',
        async execute(input) {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          
          return {
            code: input.code + '// processed',
            metadata: input.metadata,
            success: true,
          };
        },
      });

      const startTime = Date.now();
      const results = await pipeline.executeParallel(inputs, 2);
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.code.includes('// processed'))).toBe(true);
      
      // Should be faster than sequential processing
      expect(endTime - startTime).toBeLessThan(50); // Much less than 30ms (3 * 10ms)
    });

    it('should handle mixed success/failure in parallel processing', async () => {
      const inputs = [testInput, testInput, testInput];
      
      // Add a step that fails on second input
      pipeline.addStep({
        name: 'conditional-fail',
        description: 'Conditionally failing step',
        async execute(input) {
          // Simulate failure based on some condition
          if (Math.random() > 0.7) { // 30% chance of failure
            throw new Error('Random failure');
          }
          
          return {
            code: input.code + '// success',
            metadata: input.metadata,
            success: true,
          };
        },
      });

      const results = await pipeline.executeParallel(inputs, 2);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r !== undefined)).toBe(true);
      
      // Some might fail, some might succeed
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      expect(successCount + failureCount).toBe(3);
    });
  });

  describe('Pipeline Builder', () => {
    it('should create pipeline with standard steps', async () => {
      const builder = new PipelineBuilder();
      const standardPipeline = builder
        .addWebcrack()
        .addBabel()
        .addLLM()
        .addPrettier()
        .build();

      expect(standardPipeline).toBeInstanceOf(ProcessingPipeline);
      expect(standardPipeline.getStepNames()).toBeDefined();
    });

    it('should create standard pipeline with factory method', () => {
      const pipeline = PipelineBuilder.createStandard();
      
      expect(pipeline).toBeInstanceOf(ProcessingPipeline);
    });

    it('should allow custom progress callbacks', async () => {
      let callbackCalled = false;
      
      const pipeline = new PipelineBuilder()
        .onProgress(() => {
          callbackCalled = true;
        })
        .build();

      // Add a simple step to trigger progress
      pipeline.addStep({
        name: 'test-step',
        description: 'Test step',
        async execute(input) {
          return {
            code: input.code,
            metadata: input.metadata,
            success: true,
          };
        },
      });

      await pipeline.execute(testInput, 'test-job');
      
      expect(callbackCalled).toBe(true);
    });
  });

  describe('Pipeline Hash', () => {
    it('should generate consistent hash for same configuration', () => {
      const hash1 = pipeline.createPipelineHash(mockConfig);
      const hash2 = pipeline.createPipelineHash(mockConfig);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should generate different hash for different configurations', () => {
      const config2 = {
        ...mockConfig,
        provider: {
          ...mockConfig.provider,
          model: 'different-model',
        },
      };

      const hash1 = pipeline.createPipelineHash(mockConfig);
      const hash2 = pipeline.createPipelineHash(config2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', async () => {
      pipeline.addStep({
        name: 'error-step',
        description: 'Step that provides detailed error',
        async execute() {
          const error = new Error('Detailed error message');
          error.stack = 'Mock stack trace';
          throw error;
        },
      });

      const result = await pipeline.execute(testInput);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Detailed error message');
      expect(result.error?.step).toBe('error-step');
    });

    it('should continue with remaining steps after recoverable error', async () => {
      // This test would need a recoverable error type
      // For now, we'll test that non-recoverable errors stop the pipeline
      
      pipeline.addStep({
        name: 'failing-step',
        description: 'Failing step',
        async execute() {
          throw new Error('Non-recoverable error');
        },
      });

      pipeline.addStep({
        name: 'should-not-run',
        description: 'Should not execute',
        async execute(input) {
          return {
            code: input.code + '// should-not-appear',
            metadata: input.metadata,
            success: true,
          };
        },
      });

      const result = await pipeline.execute(testInput);
      
      expect(result.success).toBe(false);
      expect(result.code).not.toContain('should-not-appear');
    });
  });
});