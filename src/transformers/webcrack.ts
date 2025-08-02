/**
 * Webcrack transformer for reverse bundling and deobfuscation
 */

import { webcrack } from 'webcrack';
import { ProcessingStep, ProcessingInput, ProcessingOutput } from '../types.js';
import { WebcrackError, ReScriptError, ErrorCode } from '../utils/errors.js';

export interface WebcrackOptions {
  unpack?: boolean;
  deobfuscate?: boolean;
  unminify?: boolean;
  jsx?: boolean;
  timeout?: number;
  maxSize?: number;
}

export class WebcrackTransformer implements ProcessingStep {
  public readonly name = 'webcrack';
  public readonly description = 'Reverse bundling and deobfuscation using Webcrack';

  private options: WebcrackOptions;

  constructor(options: WebcrackOptions = {}) {
    this.options = {
      unpack: true,
      deobfuscate: true,
      unminify: true,
      jsx: false,
      timeout: 30000, // 30 seconds default
      maxSize: 10 * 1024 * 1024, // 10MB max file size
      ...options,
    };
  }

  /**
   * Execute webcrack transformation
   */
  async execute(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = Date.now();

    try {
      // Validate input size
      if (input.code.length > (this.options.maxSize || 10 * 1024 * 1024)) {
        throw new WebcrackError(
          `Input code too large: ${Math.round(input.code.length / 1024 / 1024)}MB (max: ${Math.round((this.options.maxSize || 0) / 1024 / 1024)}MB)`
        );
      }

      // Check if code appears to need webcrack processing
      const needsProcessing = this.shouldProcess(input.code);
      
      if (!needsProcessing) {
        console.log('⏭️  Code appears readable, skipping webcrack processing');
        return {
          code: input.code,
          metadata: {
            ...input.metadata,
            statistics: {
              ...input.metadata.statistics,
              linesOfCode: input.code.split('\n').length,
            },
          },
          success: true,
          warnings: ['Code appears already readable, webcrack step skipped'],
        };
      }

      console.log('🔓 Processing with webcrack...');

      // Execute webcrack with timeout
      const result = await this.executeWithTimeout(
        () => webcrack(input.code, {
          unpack: this.options.unpack,
          deobfuscate: this.options.deobfuscate,
          unminify: this.options.unminify,
          jsx: this.options.jsx,
        }),
        this.options.timeout || 30000
      );

      const processingTime = Date.now() - startTime;

      // Extract processed code
      const processedCode = result.code || input.code;
      
      // Calculate improvement metrics
      const metrics = this.calculateMetrics(input.code, processedCode);

      console.log(`✓ Webcrack completed in ${processingTime}ms`);
      console.log(`  Lines: ${metrics.originalLines} → ${metrics.processedLines} (+${metrics.lineIncrease}%)`);
      console.log(`  Avg line length: ${metrics.originalAvgLineLength} → ${metrics.processedAvgLineLength}`);

      return {
        code: processedCode,
        metadata: {
          ...input.metadata,
          statistics: {
            ...input.metadata.statistics,
            linesOfCode: metrics.processedLines,
            functionsCount: this.countFunctions(processedCode),
            variablesCount: this.countVariables(processedCode),
            complexityScore: this.calculateComplexity(processedCode),
          },
        },
        success: true,
        warnings: undefined, // result.warnings?.length ? result.warnings : undefined,
      };

    } catch (error) {
      if (error instanceof WebcrackError) {
        throw error;
      }

      // Create WebcrackError from generic error
      const webcrackError = new WebcrackError(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );

      return {
        code: input.code,
        metadata: input.metadata,
        success: false,
        error: webcrackError.toProcessingError(),
      };
    }
  }

  /**
   * Determine if code needs webcrack processing
   */
  private shouldProcess(code: string): boolean {
    const lines = code.split('\n');
    const totalLength = lines.reduce((sum, line) => sum + line.trim().length, 0);
    const avgLineLength = totalLength / lines.length;
    
    // Indicators that suggest minified/obfuscated code
    const indicators = {
      // Very long lines suggest minification
      longLines: avgLineLength > 200,
      
      // Many single-letter variables suggest obfuscation
      singleLetterVars: this.hasManyShortVars(code),
      
      // Hex/unicode encoding suggests obfuscation
      hasEncoding: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/i.test(code),
      
      // Eval usage suggests obfuscation
      hasEval: /eval\s*\(/.test(code),
      
      // String concatenation patterns
      hasStringConcat: /["'][^"']*["']\s*\+\s*["'][^"']*["']/.test(code),
      
      // Very few line breaks relative to semicolons
      minifiedStructure: this.appearsMinified(code),
    };

    // Count positive indicators
    const indicatorCount = Object.values(indicators).filter(Boolean).length;
    
    // Need processing if we have multiple indicators
    const needsProcessing = indicatorCount >= 2;

    if (needsProcessing) {
      const activeIndicators = Object.entries(indicators)
        .filter(([_, active]) => active)
        .map(([name]) => name);
      
      console.log(`🔍 Detected minified/obfuscated code: ${activeIndicators.join(', ')}`);
    }

    return needsProcessing;
  }

  /**
   * Check for many short variable names
   */
  private hasManyShortVars(code: string): boolean {
    const allVars = code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    const shortVars = allVars.filter(v => v.length === 1);
    
    return allVars.length > 0 && (shortVars.length / allVars.length) > 0.3;
  }

  /**
   * Check if code appears minified
   */
  private appearsMinified(code: string): boolean {
    const semicolons = (code.match(/;/g) || []).length;
    const lineBreaks = (code.match(/\n/g) || []).length;
    
    // Minified code has many semicolons but few line breaks
    return semicolons > 10 && lineBreaks > 0 && (semicolons / lineBreaks) > 5;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new WebcrackError(`Webcrack processing timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Calculate improvement metrics
   */
  private calculateMetrics(original: string, processed: string): {
    originalLines: number;
    processedLines: number;
    lineIncrease: number;
    originalAvgLineLength: number;
    processedAvgLineLength: number;
    sizeIncrease: number;
  } {
    const originalLines = original.split('\n');
    const processedLines = processed.split('\n');
    
    const originalAvgLineLength = originalLines.reduce((sum, line) => sum + line.length, 0) / originalLines.length;
    const processedAvgLineLength = processedLines.reduce((sum, line) => sum + line.length, 0) / processedLines.length;
    
    return {
      originalLines: originalLines.length,
      processedLines: processedLines.length,
      lineIncrease: Math.round(((processedLines.length - originalLines.length) / originalLines.length) * 100),
      originalAvgLineLength: Math.round(originalAvgLineLength),
      processedAvgLineLength: Math.round(processedAvgLineLength),
      sizeIncrease: Math.round(((processed.length - original.length) / original.length) * 100),
    };
  }

  /**
   * Count functions in code
   */
  private countFunctions(code: string): number {
    const functionPatterns = [
      /function\s+\w+/g,
      /\w+\s*:\s*function/g,
      /=>\s*{/g,
      /\w+\s*=\s*function/g,
    ];
    
    return functionPatterns.reduce((count, pattern) => {
      return count + (code.match(pattern) || []).length;
    }, 0);
  }

  /**
   * Count variables in code
   */
  private countVariables(code: string): number {
    const varPatterns = [
      /\b(?:var|let|const)\s+\w+/g,
    ];
    
    return varPatterns.reduce((count, pattern) => {
      return count + (code.match(pattern) || []).length;
    }, 0);
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(code: string): number {
    let complexity = 0;
    
    // Base complexity from size
    const lines = code.split('\n').length;
    if (lines > 1000) complexity += 3;
    else if (lines > 500) complexity += 2;
    else if (lines > 100) complexity += 1;
    
    // Function complexity
    const functions = this.countFunctions(code);
    if (functions > 50) complexity += 2;
    else if (functions > 20) complexity += 1;
    
    // Nesting complexity
    const maxBraceDepth = this.calculateMaxBraceDepth(code);
    if (maxBraceDepth > 10) complexity += 2;
    else if (maxBraceDepth > 5) complexity += 1;
    
    return complexity;
  }

  /**
   * Calculate maximum brace nesting depth
   */
  private calculateMaxBraceDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return maxDepth;
  }

  /**
   * Update transformer options
   */
  updateOptions(options: Partial<WebcrackOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): WebcrackOptions {
    return { ...this.options };
  }
}