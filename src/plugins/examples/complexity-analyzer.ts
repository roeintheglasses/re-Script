/**
 * Example code complexity analyzer plugin
 */

import { AnalyzerPlugin, PluginContext, AnalysisResult } from '../types.js';

export const complexityAnalyzerPlugin: AnalyzerPlugin = {
  metadata: {
    name: 'complexity-analyzer',
    version: '1.0.0',
    description: 'Analyzes JavaScript code complexity and provides insights',
    author: 're-Script Team',
    category: 'analyzer',
    tags: ['complexity', 'analysis', 'metrics', 'quality'],
  },

  async analyze(input: string, context: PluginContext): Promise<AnalysisResult> {
    context.utils.log('info', 'Starting complexity analysis');

    const metrics = {
      linesOfCode: this.countLines(input),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(input),
      functionCount: this.countFunctions(input),
      classCount: this.countClasses(input),
      variableCount: this.countVariables(input),
      commentLines: this.countComments(input),
      nestedDepth: this.calculateMaxNestedDepth(input),
    };

    const complexity = this.calculateOverallComplexity(metrics);
    const suggestions = this.generateSuggestions(metrics);
    const warnings = this.generateWarnings(metrics);

    context.utils.log('info', `Analysis completed - complexity score: ${complexity}`);

    return {
      complexity,
      suggestions,
      warnings,
      metrics,
      metadata: {
        analysisDate: new Date().toISOString(),
        analyzer: 'complexity-analyzer',
        version: '1.0.0',
      },
    };
  },

  async init(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Complexity analyzer plugin initialized');
  },

  async cleanup(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Complexity analyzer plugin cleaned up');
  },

  /**
   * Count lines of code (excluding empty lines and comments)
   */
  private countLines(code: string): number {
    const lines = code.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    }).length;
  },

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*.*?:/g, // Ternary operators
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  },

  /**
   * Count function declarations
   */
  private countFunctions(code: string): number {
    const functionPatterns = [
      /function\s+\w+/g,
      /const\s+\w+\s*=\s*\(/g,
      /let\s+\w+\s*=\s*\(/g,
      /var\s+\w+\s*=\s*\(/g,
      /\w+\s*:\s*function/g,
      /=>\s*{/g,
    ];

    let count = 0;
    for (const pattern of functionPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  },

  /**
   * Count class declarations
   */
  private countClasses(code: string): number {
    const classMatches = code.match(/class\s+\w+/g);
    return classMatches ? classMatches.length : 0;
  },

  /**
   * Count variable declarations
   */
  private countVariables(code: string): number {
    const variablePatterns = [
      /\bconst\s+\w+/g,
      /\blet\s+\w+/g,
      /\bvar\s+\w+/g,
    ];

    let count = 0;
    for (const pattern of variablePatterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  },

  /**
   * Count comment lines
   */
  private countComments(code: string): number {
    const lines = code.split('\n');
    let commentLines = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('/*')) {
        inBlockComment = true;
        commentLines++;
      } else if (trimmed.endsWith('*/')) {
        if (inBlockComment) {
          commentLines++;
          inBlockComment = false;
        }
      } else if (inBlockComment) {
        commentLines++;
      } else if (trimmed.startsWith('//')) {
        commentLines++;
      }
    }

    return commentLines;
  },

  /**
   * Calculate maximum nested depth
   */
  private calculateMaxNestedDepth(code: string): number {
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
  },

  /**
   * Calculate overall complexity score
   */
  private calculateOverallComplexity(metrics: Record<string, number>): number {
    // Weighted complexity calculation
    const weights = {
      cyclomaticComplexity: 0.3,
      nestedDepth: 0.2,
      functionCount: 0.15,
      linesOfCode: 0.1,
      classCount: 0.1,
      variableCount: 0.05,
    };

    let score = 0;
    for (const [metric, value] of Object.entries(metrics)) {
      const weight = weights[metric as keyof typeof weights] || 0;
      score += value * weight;
    }

    return Math.round(score * 100) / 100;
  },

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(metrics: Record<string, number>): string[] {
    const suggestions: string[] = [];

    if (metrics.cyclomaticComplexity > 15) {
      suggestions.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }

    if (metrics.nestedDepth > 4) {
      suggestions.push('Reduce nesting depth by extracting nested logic into separate functions');
    }

    if (metrics.linesOfCode > 500) {
      suggestions.push('This file is quite large - consider splitting it into multiple modules');
    }

    if (metrics.functionCount > 20) {
      suggestions.push('Consider organizing functions into classes or modules for better structure');
    }

    const commentRatio = metrics.commentLines / (metrics.linesOfCode + metrics.commentLines);
    if (commentRatio < 0.1) {
      suggestions.push('Add more comments to improve code documentation');
    }

    if (suggestions.length === 0) {
      suggestions.push('Code complexity looks good! Consider adding unit tests if not already present');
    }

    return suggestions;
  },

  /**
   * Generate warnings for potential issues
   */
  private generateWarnings(metrics: Record<string, number>): string[] {
    const warnings: string[] = [];

    if (metrics.cyclomaticComplexity > 25) {
      warnings.push('Very high cyclomatic complexity detected - code may be difficult to test and maintain');
    }

    if (metrics.nestedDepth > 6) {
      warnings.push('Excessive nesting depth detected - code readability may be compromised');
    }

    if (metrics.linesOfCode > 1000) {
      warnings.push('File is very large - consider refactoring into smaller modules');
    }

    if (metrics.functionCount === 0) {
      warnings.push('No functions detected - code may not be properly structured');
    }

    return warnings;
  },
};

export default complexityAnalyzerPlugin;