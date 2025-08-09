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
    const _startTime = Date.now();

    try {
      console.log(`🤖 Processing with ${this.provider.name}...`);

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
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 4000,
      };

      const response = await this.provider.processCode(request);
      const _processingTime = Date.now() - startTime;

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
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          maxTokens: 4000,
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
   * Apply renamings to code using AST-aware replacement
   */
  private async applyRenamings(code: string, suggestions: RenameSuggestion[]): Promise<string> {
    if (suggestions.length === 0) {
      return code;
    }

    console.log(`🔄 Applying ${suggestions.length} renamings...`);

    // Try AST-aware renaming first, fall back to safer regex if needed
    try {
      return await this.applyRenamingsWithAST(code, suggestions);
    } catch (error) {
      console.warn(`⚠️  AST-based renaming failed, using safer regex approach: ${error instanceof Error ? error.message : String(error)}`);
      return await this.applyRenamingsWithSafeRegex(code, suggestions);
    }
  }

  /**
   * Apply renamings using Babel AST traversal (safer approach)
   */
  private async applyRenamingsWithAST(code: string, suggestions: RenameSuggestion[]): Promise<string> {
    const babel = await import('@babel/core');
    const t = await import('@babel/types');

    // Create a map of renamings for quick lookup
    const renameMap = new Map<string, string>();
    suggestions.forEach(s => renameMap.set(s.originalName, s.suggestedName));

    let appliedCount = 0;
    const appliedRenamings: Array<{originalName: string, suggestedName: string, count: number}> = [];

    const result = babel.transformSync(code, {
      plugins: [
        function() {
          return {
            visitor: {
              Identifier(path: any) {
                const name = path.node.name;
                if (renameMap.has(name)) {
                  // Only rename if this is not a property access (obj.prop)
                  // and not in a string literal or template literal
                  const parent = path.parent;
                  const isProperty = t.isMemberExpression(parent) && parent.property === path.node && !parent.computed;
                  const isObjectProperty = t.isObjectProperty(parent) && parent.key === path.node && !parent.computed;
                  const isMethodDefinition = t.isClassMethod(parent) && parent.key === path.node;
                  
                  if (!isProperty && !isObjectProperty && !isMethodDefinition) {
                    const newName = renameMap.get(name)!;
                    path.node.name = newName;
                    
                    // Track the renaming
                    const existing = appliedRenamings.find(r => r.originalName === name);
                    if (existing) {
                      existing.count++;
                    } else {
                      appliedRenamings.push({ originalName: name, suggestedName: newName, count: 1 });
                      appliedCount++;
                    }
                  }
                }
              }
            }
          };
        }
      ],
      compact: false,
      retainLines: true
    });

    if (!result || !result.code) {
      throw new Error('Babel transformation returned no result');
    }

    // Log applied renamings
    appliedRenamings.forEach(r => {
      const suggestion = suggestions.find(s => s.originalName === r.originalName);
      const confidence = suggestion ? (suggestion.confidence * 100).toFixed(0) : 'unknown';
      console.log(`    ${r.originalName} → ${r.suggestedName} (${r.count} occurrences, confidence: ${confidence}%)`);
    });

    console.log(`✓ Applied ${appliedCount}/${suggestions.length} renamings`);
    return result.code;
  }

  /**
   * Fallback: Apply renamings with safer regex that avoids common pitfalls
   */
  private async applyRenamingsWithSafeRegex(code: string, suggestions: RenameSuggestion[]): Promise<string> {
    // Sort suggestions by original name length (longest first) to avoid partial replacements
    const sortedSuggestions = [...suggestions].sort((a, b) => b.originalName.length - a.originalName.length);

    let renamedCode = code;
    let appliedCount = 0;

    for (const suggestion of sortedSuggestions) {
      try {
        // Skip single character variables that are likely to cause issues in regex/strings
        if (suggestion.originalName.length === 1) {
          console.log(`    Skipping ${suggestion.originalName} → ${suggestion.suggestedName} (single char, high risk)`);
          continue;
        }

        // Use word boundary regex to ensure we only replace complete identifiers
        const regex = new RegExp(`\\b${this.escapeRegex(suggestion.originalName)}\\b`, 'g');
        const matches = renamedCode.match(regex);
        
        if (matches && matches.length > 0) {
          // Additional safety check: don't replace if it would create invalid syntax
          const testReplacement = renamedCode.replace(regex, suggestion.suggestedName);
          
          // Basic validation - check for obvious syntax errors
          if (this.hasObviousSyntaxErrors(testReplacement)) {
            console.log(`    Skipping ${suggestion.originalName} → ${suggestion.suggestedName} (would create syntax errors)`);
            continue;
          }

          renamedCode = testReplacement;
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
   * Basic check for obvious syntax errors that would be created by renaming
   */
  private hasObviousSyntaxErrors(code: string): boolean {
    // Check for invalid regex escape sequences like \day, \minuteUnit, etc.
    const invalidEscapePattern = /\\[a-zA-Z][a-zA-Z0-9_]+/g;
    const matches = code.match(invalidEscapePattern);
    
    if (matches) {
      // Allow known valid escape sequences
      const validEscapes = /\\(n|r|t|b|f|v|0|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]+\}|[\\'"\/]|[.*+?^${}()|[\]\\]|[bBdDfnrstvwWS])/;
      
      for (const match of matches) {
        if (!validEscapes.test(match)) {
          return true;
        }
      }
    }
    
    return false;
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
    // Extract provider config from the full config
    const fullConfig = input.config as any;
    const providerConfig = fullConfig.provider;
    
    if (!providerConfig) {
      throw new ReScriptError(
        ErrorCode.INVALID_CONFIG,
        'Provider configuration not found in config',
        'provider-setup'
      );
    }
    
    const provider = ProviderFactory.createProvider(providerConfig);
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