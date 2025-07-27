/**
 * Babel transformer for AST-based code improvements
 */

import { transform } from '@babel/core';
import * as t from '@babel/types';
import { ProcessingStep, ProcessingInput, ProcessingOutput } from '../types.js';
import { BabelTransformError, ReScriptError, ErrorCode } from '../utils/errors.js';

export interface BabelTransformOptions {
  enableBeautifier?: boolean;
  convertVoidToUndefined?: boolean;
  flipComparisons?: boolean;
  expandNumberLiterals?: boolean;
  removeUnnecessaryParens?: boolean;
  simplifyBooleanExpressions?: boolean;
  timeout?: number;
}

export class BabelTransformer implements ProcessingStep {
  public readonly name = 'babel';
  public readonly description = 'AST-based code transformations using Babel';

  private options: BabelTransformOptions;

  constructor(options: BabelTransformOptions = {}) {
    this.options = {
      enableBeautifier: true,
      convertVoidToUndefined: true,
      flipComparisons: true,
      expandNumberLiterals: true,
      removeUnnecessaryParens: true,
      simplifyBooleanExpressions: true,
      timeout: 15000, // 15 seconds default
      ...options,
    };
  }

  /**
   * Execute Babel transformations
   */
  async execute(input: ProcessingInput): Promise<ProcessingOutput> {
    const startTime = Date.now();

    try {
      console.log('🔧 Applying Babel transformations...');

      // Build plugins list based on options
      const plugins = this.buildPluginsList();

      // Execute transformation with timeout
      const result = await this.executeWithTimeout(
        () => this.transformCode(input.code, plugins),
        this.options.timeout || 15000
      );

      const processingTime = Date.now() - startTime;

      // Calculate improvement metrics
      const metrics = this.calculateMetrics(input.code, result);

      console.log(`✓ Babel transformations completed in ${processingTime}ms`);
      console.log(`  Applied ${plugins.length} transformation(s)`);

      return {
        code: result,
        metadata: {
          ...input.metadata,
          statistics: {
            ...input.metadata.statistics,
            linesOfCode: result.split('\n').length,
            functionsCount: this.countFunctions(result),
            variablesCount: this.countVariables(result),
            complexityScore: this.calculateComplexity(result),
          },
        },
        success: true,
      };

    } catch (error) {
      if (error instanceof BabelTransformError) {
        throw error;
      }

      // Create BabelTransformError from generic error
      const babelError = new BabelTransformError(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );

      return {
        code: input.code,
        metadata: input.metadata,
        success: false,
        error: babelError.toProcessingError(),
      };
    }
  }

  /**
   * Transform code using Babel
   */
  private async transformCode(code: string, plugins: unknown[]): Promise<string> {
    return new Promise((resolve, reject) => {
      transform(code, {
        plugins,
        compact: false,
        minified: false,
        comments: true, // Preserve comments
        sourceMaps: false,
        retainLines: false,
        parserOpts: {
          sourceType: 'unambiguous',
          allowImportExportEverywhere: true,
          allowReturnOutsideFunction: true,
          strictMode: false,
          plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
            'classProperties',
            'objectRestSpread',
            'asyncGenerators',
            'functionBind',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'dynamicImport',
            'nullishCoalescingOperator',
            'optionalChaining',
          ],
        },
      }, (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result || !result.code) {
          reject(new Error('Babel transformation produced no result'));
          return;
        }

        resolve(result.code);
      });
    });
  }

  /**
   * Build plugins list based on options
   */
  private buildPluginsList(): unknown[] {
    const plugins: unknown[] = [];

    if (this.options.convertVoidToUndefined) {
      plugins.push(this.createVoidToUndefinedPlugin());
    }

    if (this.options.flipComparisons) {
      plugins.push(this.createFlipComparisonsPlugin());
    }

    if (this.options.expandNumberLiterals) {
      plugins.push(this.createExpandNumbersPlugin());
    }

    if (this.options.removeUnnecessaryParens) {
      plugins.push(this.createRemoveParensPlugin());
    }

    if (this.options.simplifyBooleanExpressions) {
      plugins.push(this.createSimplifyBooleansPlugin());
    }

    if (this.options.enableBeautifier) {
      // Add transform-beautifier if available
      try {
        plugins.push('babel-plugin-transform-beautifier');
      } catch {
        // Plugin not available, skip
        console.warn('⚠️  babel-plugin-transform-beautifier not available');
      }
    }

    return plugins;
  }

  /**
   * Plugin to convert void 0 to undefined
   */
  private createVoidToUndefinedPlugin() {
    return {
      visitor: {
        UnaryExpression(path: any) {
          const { node } = path;
          if (
            node.operator === 'void' &&
            t.isNumericLiteral(node.argument) &&
            node.argument.value === 0
          ) {
            path.replaceWith(t.identifier('undefined'));
          }
        },
      },
    };
  }

  /**
   * Plugin to flip literal-first comparisons
   */
  private createFlipComparisonsPlugin() {
    const COMPARISON_OPERATORS: Record<string, string> = {
      '==': '==',
      '!=': '!=',
      '===': '===',
      '!==': '!==',
      '<': '>',
      '<=': '>=',
      '>': '<',
      '>=': '<=',
    };

    return {
      visitor: {
        BinaryExpression(path: any) {
          const { node } = path;
          if (
            t.isLiteral(node.left) &&
            !t.isLiteral(node.right) &&
            COMPARISON_OPERATORS[node.operator]
          ) {
            path.replaceWith(
              t.binaryExpression(
                COMPARISON_OPERATORS[node.operator]!,
                node.right,
                node.left
              )
            );
          }
        },
      },
    };
  }

  /**
   * Plugin to expand scientific notation numbers
   */
  private createExpandNumbersPlugin() {
    return {
      visitor: {
        NumericLiteral(path: any) {
          const { node } = path;
          if (node.extra?.raw?.includes('e')) {
            const expandedValue = Number(node.extra.raw);
            if (!isNaN(expandedValue) && isFinite(expandedValue)) {
              path.replaceWith(t.numericLiteral(expandedValue));
            }
          }
        },
      },
    };
  }

  /**
   * Plugin to remove unnecessary parentheses
   */
  private createRemoveParensPlugin() {
    return {
      visitor: {
        ParenthesizedExpression(path: any) {
          const { node, parent } = path;
          
          // Keep parentheses in certain contexts
          if (
            t.isReturnStatement(parent) ||
            t.isThrowStatement(parent) ||
            t.isArrowFunctionExpression(parent) ||
            t.isConditionalExpression(parent)
          ) {
            return;
          }

          // Remove unnecessary parentheses
          if (
            t.isIdentifier(node.expression) ||
            t.isLiteral(node.expression) ||
            t.isMemberExpression(node.expression) ||
            t.isCallExpression(node.expression)
          ) {
            path.replaceWith(node.expression);
          }
        },
      },
    };
  }

  /**
   * Plugin to simplify boolean expressions
   */
  private createSimplifyBooleansPlugin() {
    return {
      visitor: {
        BinaryExpression(path: any) {
          const { node } = path;

          // Simplify !!x to Boolean(x)
          if (
            node.operator === '!' &&
            t.isUnaryExpression(node.argument) &&
            node.argument.operator === '!'
          ) {
            path.replaceWith(
              t.callExpression(
                t.identifier('Boolean'),
                [node.argument.argument]
              )
            );
          }

          // Simplify x === true to x, x === false to !x
          if (node.operator === '===' || node.operator === '==') {
            if (t.isBooleanLiteral(node.right)) {
              if (node.right.value === true) {
                path.replaceWith(node.left);
              } else {
                path.replaceWith(t.unaryExpression('!', node.left));
              }
            } else if (t.isBooleanLiteral(node.left)) {
              if (node.left.value === true) {
                path.replaceWith(node.right);
              } else {
                path.replaceWith(t.unaryExpression('!', node.right));
              }
            }
          }
        },
      },
    };
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
        reject(new BabelTransformError(`Babel transformation timed out after ${timeoutMs}ms`));
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
  private calculateMetrics(original: string, transformed: string): {
    linesAdded: number;
    charactersChanged: number;
    transformationRatio: number;
  } {
    const originalLines = original.split('\n').length;
    const transformedLines = transformed.split('\n').length;
    
    return {
      linesAdded: transformedLines - originalLines,
      charactersChanged: Math.abs(transformed.length - original.length),
      transformationRatio: transformed.length / original.length,
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
  updateOptions(options: Partial<BabelTransformOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  getOptions(): BabelTransformOptions {
    return { ...this.options };
  }
}