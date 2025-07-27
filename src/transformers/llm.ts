/**
 * LLM transformer for AI-powered variable/function renaming
 */

import { ProcessingStep, ProcessingInput, ProcessingOutput, LLMRequest, RenameSuggestion } from '../types.js';
import { BaseLLMProvider } from '../providers/base.js';
import { ProviderFactory } from '../providers/factory.js';
import { ReScriptError, ErrorCode, LLMRequestError } from '../utils/errors.js';

export interface LLMTransformOptions {
  chunkSize?: number;
  overlapRatio?: number;
  concurrency?: number;
  minConfidenceThreshold?: number;
  maxRetries?: number;
  timeout?: number;
}

export class LLMTransformer implements ProcessingStep {
  public readonly name = 'llm';
  public readonly description = 'AI-powered variable and function renaming';

  private provider: BaseLLMProvider;
  private options: LLMTransformOptions;

  constructor(provider: BaseLLMProvider, options: LLMTransformOptions = {}) {
    this.provider = provider;
    this.options = {
      chunkSize: 4000,
      overlapRatio: 0.1,
      concurrency: 3,
      minConfidenceThreshold: 0.3,
      maxRetries: 2,
      timeout: 60000, // 60 seconds
      ...options,
    };
  }

  /**
   * Execute LLM-powered renaming
   */
  async execute(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Processing with ${this.provider.name} (${input.config.provider.model})...`);

      // Check if code is small enough to process as single chunk
      if (input.code.length <= this.options.chunkSize!) {
        return await this.processSingleChunk(input);
      }

      // Process large code in chunks
      return await this.processInChunks(input);

    } catch (error) {
      if (error instanceof ReScriptError) {
        throw error;
      }

      const llmError = new LLMRequestError(
        this.provider.name,
        error instanceof Error ? error.message : String(error),
        false,
        error instanceof Error ? error : undefined
      );

      return {
        code: input.code,
        metadata: input.metadata,
        success: false,
        error: llmError.toProcessingError(),
      };
    }
  }

  /**
   * Process code as a single chunk
   */
  private async processSingleChunk(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = Date.now();

    try {
      const request: LLMRequest = {
        code: input.code,
        model: input.config.provider.model,
        temperature: input.config.provider.temperature,
        maxTokens: input.config.provider.maxTokens,
      };

      const response = await this.provider.processCode(request);
      const processingTime = Date.now() - startTime;

      // Filter suggestions by confidence threshold
      const highConfidenceSuggestions = response.suggestions.filter(
        s => s.confidence >= this.options.minConfidenceThreshold!
      );

      console.log(`  Found ${response.suggestions.length} suggestions (${highConfidenceSuggestions.length} high confidence)`);
      console.log(`  Tokens used: ${response.tokensUsed}`);
      console.log(`  Overall confidence: ${(response.confidence * 100).toFixed(1)}%`);

      // Apply renamings to code
      const renamedCode = await this.applyRenamings(input.code, highConfidenceSuggestions);

      return {
        code: renamedCode,
        metadata: {
          ...input.metadata,
          statistics: {
            ...input.metadata.statistics,
            tokensCount: response.tokensUsed,
          },
        },
        success: true,
        warnings: this.generateWarnings(response.suggestions, highConfidenceSuggestions),
      };

    } catch (error) {
      throw new LLMRequestError(
        this.provider.name,
        `Single chunk processing failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process large code by splitting into chunks
   */
  private async processInChunks(input: ProcessingInput): Promise<ProcessingOutput> {
    console.log(`📦 Splitting large code into chunks (${this.options.chunkSize} chars each)...`);

    // Split code into chunks with overlap
    const chunks = this.splitIntoChunks(input.code);
    console.log(`  Created ${chunks.length} chunks`);

    // Process chunks concurrently
    const allSuggestions: RenameSuggestion[] = [];
    let totalTokensUsed = 0;

    const semaphore = new Semaphore(this.options.concurrency!);
    const processChunk = async (chunk: string, index: number): Promise<void> => {
      await semaphore.acquire();
      
      try {
        console.log(`  Processing chunk ${index + 1}/${chunks.length}...`);

        const request: LLMRequest = {
          code: chunk,
          model: input.config.provider.model,
          temperature: input.config.provider.temperature,
          maxTokens: Math.min(input.config.provider.maxTokens, 4096), // Limit for chunks
        };

        const response = await this.provider.processCode(request);
        
        // Add suggestions to collection
        const highConfidenceSuggestions = response.suggestions.filter(
          s => s.confidence >= this.options.minConfidenceThreshold!
        );
        
        allSuggestions.push(...highConfidenceSuggestions);
        totalTokensUsed += response.tokensUsed;

        console.log(`    Chunk ${index + 1}: ${response.suggestions.length} suggestions (${highConfidenceSuggestions.length} high confidence)`);

      } finally {
        semaphore.release();
      }
    };

    // Process all chunks
    const chunkTasks = chunks.map((chunk, index) => processChunk(chunk, index));
    await Promise.all(chunkTasks);

    // Deduplicate and merge suggestions
    const uniqueSuggestions = this.deduplicateSuggestions(allSuggestions);
    console.log(`  Total unique suggestions: ${uniqueSuggestions.length}`);

    // Apply renamings to original code
    const renamedCode = await this.applyRenamings(input.code, uniqueSuggestions);

    return {
      code: renamedCode,
      metadata: {
        ...input.metadata,
        statistics: {
          ...input.metadata.statistics,
          tokensCount: totalTokensUsed,
        },
      },
      success: true,
      warnings: [`Processed in ${chunks.length} chunks with ${uniqueSuggestions.length} renamings applied`],
    };
  }

  /**
   * Split code into overlapping chunks
   */
  private splitIntoChunks(code: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.options.chunkSize!;
    const overlapSize = Math.floor(chunkSize * this.options.overlapRatio!);
    
    let start = 0;
    while (start < code.length) {
      let end = Math.min(start + chunkSize, code.length);
      
      // Try to break at a good boundary (end of line, semicolon, or brace)
      if (end < code.length) {
        const boundaryChars = ['\n', ';', '}', ')'];
        for (let i = end; i > start + chunkSize * 0.8; i--) {
          if (boundaryChars.includes(code[i]!)) {
            end = i + 1;
            break;
          }
        }
      }
      
      chunks.push(code.slice(start, end));
      start = end - overlapSize;
      
      if (start >= code.length) break;
    }
    
    return chunks;
  }

  /**
   * Deduplicate suggestions by original name
   */
  private deduplicateSuggestions(suggestions: RenameSuggestion[]): RenameSuggestion[] {
    const suggestionMap = new Map<string, RenameSuggestion>();
    
    for (const suggestion of suggestions) {
      const existing = suggestionMap.get(suggestion.originalName);
      
      if (!existing || suggestion.confidence > existing.confidence) {
        suggestionMap.set(suggestion.originalName, suggestion);
      }
    }
    
    return Array.from(suggestionMap.values())
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence desc
  }

  /**
   * Apply renamings to code
   */
  private async applyRenamings(code: string, suggestions: RenameSuggestion[]): Promise<string> {
    if (suggestions.length === 0) {
      return code;
    }

    console.log(`🔄 Applying ${suggestions.length} renamings...`);

    // Sort suggestions by original name length (longest first) to avoid partial replacements
    const sortedSuggestions = [...suggestions].sort((a, b) => b.originalName.length - a.originalName.length);

    let renamedCode = code;
    let appliedCount = 0;

    for (const suggestion of sortedSuggestions) {
      try {
        // Use word boundary regex to ensure we only replace complete identifiers
        const regex = new RegExp(`\\b${this.escapeRegex(suggestion.originalName)}\\b`, 'g');
        const matches = renamedCode.match(regex);
        
        if (matches && matches.length > 0) {
          renamedCode = renamedCode.replace(regex, suggestion.suggestedName);
          appliedCount++;
          
          console.log(`    ${suggestion.originalName} → ${suggestion.suggestedName} (${matches.length} occurrences, confidence: ${(suggestion.confidence * 100).toFixed(0)}%)`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to apply renaming ${suggestion.originalName} → ${suggestion.suggestedName}: ${error}`);
      }
    }

    console.log(`✓ Applied ${appliedCount}/${suggestions.length} renamings`);
    return renamedCode;
  }

  /**
   * Escape string for regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate warnings about suggestions
   */
  private generateWarnings(
    allSuggestions: RenameSuggestion[], 
    appliedSuggestions: RenameSuggestion[]
  ): string[] {
    const warnings: string[] = [];
    
    const lowConfidenceCount = allSuggestions.length - appliedSuggestions.length;
    if (lowConfidenceCount > 0) {
      warnings.push(
        `${lowConfidenceCount} suggestions excluded due to low confidence (< ${this.options.minConfidenceThreshold! * 100}%)`
      );
    }

    const avgConfidence = appliedSuggestions.length > 0 
      ? appliedSuggestions.reduce((sum, s) => sum + s.confidence, 0) / appliedSuggestions.length
      : 0;

    if (avgConfidence < 0.6) {
      warnings.push(`Average confidence is low (${(avgConfidence * 100).toFixed(1)}%), consider manual review`);
    }

    return warnings;
  }

  /**
   * Get processing statistics
   */
  getStatistics(): {
    provider: string;
    model: string;
    requestCount: number;
    totalTokensUsed: number;
    averageConfidence: number;
  } {
    const providerStats = this.provider.getStatistics();
    
    return {
      provider: this.provider.name,
      model: 'unknown', // Would need to track this
      requestCount: providerStats.requestCount,
      totalTokensUsed: providerStats.totalTokensUsed,
      averageConfidence: 0, // Would need to track this
    };
  }

  /**
   * Update transformer options
   */
  updateOptions(options: Partial<LLMTransformOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): LLMTransformOptions {
    return { ...this.options };
  }

  /**
   * Create LLM transformer from config
   */
  static fromConfig(input: ProcessingInput, options?: LLMTransformOptions): LLMTransformer {
    const provider = ProviderFactory.createProvider(input.config.provider);
    return new LLMTransformer(provider, options);
  }
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    const next = this.waiting.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}