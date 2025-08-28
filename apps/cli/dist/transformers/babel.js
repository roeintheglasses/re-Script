/**
 * Babel transformer for AST-based code improvements
 */
import { transform } from '@babel/core';
import * as t from '@babel/types';
import { BabelTransformError } from '../utils/errors.js';
export class BabelTransformer {
    name = 'babel';
    description = 'AST-based code transformations using Babel';
    options;
    constructor(options = {}) {
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
    async execute(input) {
        const startTime = Date.now();
        try {
            console.log('🔧 Applying Babel transformations...');
            // Build plugins list based on options
            const plugins = this.buildPluginsList();
            // Execute transformation with timeout
            const result = await this.executeWithTimeout(() => this.transformCode(input.code, plugins), this.options.timeout || 15000);
            const processingTime = Date.now() - startTime;
            // Calculate improvement metrics
            const _metrics = this.calculateMetrics(input.code, result);
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
        }
        catch (error) {
            if (error instanceof BabelTransformError) {
                throw error;
            }
            // Create BabelTransformError from generic error
            const babelError = new BabelTransformError(error instanceof Error ? error.message : String(error), error instanceof Error ? error : undefined);
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
    async transformCode(code, plugins) {
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
    buildPluginsList() {
        const plugins = [];
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
            // Skip babel-plugin-transform-beautifier as it's not available
            // The built-in plugins above provide sufficient code improvement
            console.log('💡 Using built-in transformations for code beautification');
        }
        return plugins;
    }
    /**
     * Plugin to convert void 0 to undefined
     */
    createVoidToUndefinedPlugin() {
        return {
            visitor: {
                UnaryExpression(path) {
                    const { node } = path;
                    if (node.operator === 'void' &&
                        t.isNumericLiteral(node.argument) &&
                        node.argument.value === 0) {
                        path.replaceWith(t.identifier('undefined'));
                    }
                },
            },
        };
    }
    /**
     * Plugin to flip literal-first comparisons
     */
    createFlipComparisonsPlugin() {
        const COMPARISON_OPERATORS = {
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
                BinaryExpression(path) {
                    const { node } = path;
                    if (t.isLiteral(node.left) &&
                        !t.isLiteral(node.right) &&
                        COMPARISON_OPERATORS[node.operator]) {
                        path.replaceWith(t.binaryExpression(COMPARISON_OPERATORS[node.operator], node.right, node.left));
                    }
                },
            },
        };
    }
    /**
     * Plugin to expand scientific notation numbers
     */
    createExpandNumbersPlugin() {
        return {
            visitor: {
                NumericLiteral(path) {
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
    createRemoveParensPlugin() {
        return {
            visitor: {
                ParenthesizedExpression(path) {
                    const { node, parent } = path;
                    // Keep parentheses in certain contexts
                    if (t.isReturnStatement(parent) ||
                        t.isThrowStatement(parent) ||
                        t.isArrowFunctionExpression(parent) ||
                        t.isConditionalExpression(parent)) {
                        return;
                    }
                    // Remove unnecessary parentheses
                    if (t.isIdentifier(node.expression) ||
                        t.isLiteral(node.expression) ||
                        t.isMemberExpression(node.expression) ||
                        t.isCallExpression(node.expression)) {
                        path.replaceWith(node.expression);
                    }
                },
            },
        };
    }
    /**
     * Plugin to simplify boolean expressions
     */
    createSimplifyBooleansPlugin() {
        return {
            visitor: {
                BinaryExpression(path) {
                    const { node } = path;
                    // Simplify !!x to Boolean(x)
                    if (node.operator === '!' &&
                        t.isUnaryExpression(node.argument) &&
                        node.argument.operator === '!') {
                        path.replaceWith(t.callExpression(t.identifier('Boolean'), [node.argument.argument]));
                    }
                    // Simplify x === true to x, x === false to !x
                    if (node.operator === '===' || node.operator === '==') {
                        if (t.isBooleanLiteral(node.right)) {
                            if (node.right.value === true) {
                                path.replaceWith(node.left);
                            }
                            else {
                                path.replaceWith(t.unaryExpression('!', node.left));
                            }
                        }
                        else if (t.isBooleanLiteral(node.left)) {
                            if (node.left.value === true) {
                                path.replaceWith(node.right);
                            }
                            else {
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
    async executeWithTimeout(operation, timeoutMs) {
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
    calculateMetrics(original, transformed) {
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
    countFunctions(code) {
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
    countVariables(code) {
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
    calculateComplexity(code) {
        let complexity = 0;
        // Base complexity from size
        const lines = code.split('\n').length;
        if (lines > 1000)
            complexity += 3;
        else if (lines > 500)
            complexity += 2;
        else if (lines > 100)
            complexity += 1;
        // Function complexity
        const functions = this.countFunctions(code);
        if (functions > 50)
            complexity += 2;
        else if (functions > 20)
            complexity += 1;
        // Nesting complexity
        const maxBraceDepth = this.calculateMaxBraceDepth(code);
        if (maxBraceDepth > 10)
            complexity += 2;
        else if (maxBraceDepth > 5)
            complexity += 1;
        return complexity;
    }
    /**
     * Calculate maximum brace nesting depth
     */
    calculateMaxBraceDepth(code) {
        let maxDepth = 0;
        let currentDepth = 0;
        for (const char of code) {
            if (char === '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            }
            else if (char === '}') {
                currentDepth--;
            }
        }
        return maxDepth;
    }
    /**
     * Update transformer options
     */
    updateOptions(options) {
        this.options = { ...this.options, ...options };
    }
    /**
     * Get current options
     */
    getOptions() {
        return { ...this.options };
    }
}
//# sourceMappingURL=babel.js.map