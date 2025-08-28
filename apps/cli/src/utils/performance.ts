/**
 * Performance optimization utilities and monitoring
 */

import { performance } from 'perf_hooks';
import { cpus } from 'os';
import { ReScriptError, ErrorCode } from './errors.js';

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  throughput: {
    filesPerSecond: number;
    linesPerSecond: number;
    tokensPerSecond: number;
  };
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'io' | 'network';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  impact: number; // 0-1 scale
}

export interface OptimizationConfig {
  enableProfiling: boolean;
  enableMemoryOptimization: boolean;
  enableCpuOptimization: boolean;
  enableIOOptimization: boolean;
  maxMemoryUsage: number; // in MB
  targetCpuUsage: number; // 0-1 scale
  adaptiveConcurrency: boolean;
  enableCodeSplitting: boolean;
  enableResultCaching: boolean;
}

export interface ProcessingOptimizer {
  optimize(input: string, options: any): Promise<{
    optimizedInput: string;
    strategy: OptimizationStrategy;
    estimatedSpeedup: number;
  }>;
}

export interface OptimizationStrategy {
  type: 'chunking' | 'parallel' | 'streaming' | 'caching' | 'preprocessing';
  parameters: Record<string, unknown>;
  reason: string;
}

/**
 * Performance profiler for tracking execution metrics
 */
export class PerformanceProfiler {
  private startTime: number = 0;
  private startCpuUsage: NodeJS.CpuUsage | null = null;
  private startMemoryUsage: NodeJS.MemoryUsage | null = null;
  private metrics: Map<string, number[]> = new Map();
  private isRunning = false;

  /**
   * Start profiling
   */
  start(): void {
    this.startTime = performance.now();
    this.startCpuUsage = process.cpuUsage();
    this.startMemoryUsage = process.memoryUsage();
    this.isRunning = true;
  }

  /**
   * Stop profiling and return metrics
   */
  stop(): PerformanceMetrics {
    if (!this.isRunning) {
      throw new ReScriptError(
        ErrorCode.UNKNOWN_ERROR,
        'Profiler not running',
        'performance-profiling'
      );
    }

    const endTime = performance.now();
    const endCpuUsage = process.cpuUsage(this.startCpuUsage!);
    const endMemoryUsage = process.memoryUsage();

    const executionTime = endTime - this.startTime;

    // Calculate throughput (placeholder values - would be set from actual processing)
    const throughput = {
      filesPerSecond: 0,
      linesPerSecond: 0,
      tokensPerSecond: 0,
    };

    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(endMemoryUsage, endCpuUsage, executionTime);

    this.isRunning = false;

    return {
      executionTime,
      memoryUsage: endMemoryUsage,
      cpuUsage: endCpuUsage,
      throughput,
      bottlenecks,
    };
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * Get average for a metric
   */
  getMetricAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  /**
   * Detect performance bottlenecks
   */
  private detectBottlenecks(
    memoryUsage: NodeJS.MemoryUsage,
    cpuUsage: NodeJS.CpuUsage,
    executionTime: number
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Memory bottlenecks
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 1000) { // 1GB
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        description: `High memory usage: ${Math.round(memoryUsageMB)}MB`,
        suggestion: 'Consider using streaming processing or reducing chunk sizes',
        impact: 0.8,
      });
    } else if (memoryUsageMB > 500) { // 500MB
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        description: `Moderate memory usage: ${Math.round(memoryUsageMB)}MB`,
        suggestion: 'Monitor memory usage and consider optimization',
        impact: 0.4,
      });
    }

    // CPU bottlenecks
    const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / (executionTime * 1000);
    if (cpuUsagePercent > 0.9) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: `High CPU usage: ${Math.round(cpuUsagePercent * 100)}%`,
        suggestion: 'Consider reducing concurrency or using worker threads',
        impact: 0.7,
      });
    }

    // Execution time bottlenecks
    if (executionTime > 300000) { // 5 minutes
      bottlenecks.push({
        type: 'io',
        severity: 'medium',
        description: `Long execution time: ${Math.round(executionTime / 1000)}s`,
        suggestion: 'Consider parallel processing or caching strategies',
        impact: 0.6,
      });
    }

    return bottlenecks;
  }
}

/**
 * Adaptive concurrency controller
 */
export class ConcurrencyOptimizer {
  private currentConcurrency: number;
  private minConcurrency: number;
  private maxConcurrency: number;
  private performanceHistory: number[] = [];
  private adjustmentThreshold = 5; // measurements before adjustment

  constructor(
    initialConcurrency = cpus().length,
    minConcurrency = 1,
    maxConcurrency = cpus().length * 2
  ) {
    this.currentConcurrency = initialConcurrency;
    this.minConcurrency = minConcurrency;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Get current optimal concurrency level
   */
  getConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Record performance measurement and adjust concurrency
   */
  recordPerformance(
    throughput: number,
    cpuUsage: number,
    memoryUsage: number
  ): void {
    this.performanceHistory.push(throughput);

    // Keep only recent history
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }

    // Adjust concurrency if we have enough data
    if (this.performanceHistory.length >= this.adjustmentThreshold) {
      this.adjustConcurrency(cpuUsage, memoryUsage);
    }
  }

  /**
   * Adjust concurrency based on performance trends
   */
  private adjustConcurrency(cpuUsage: number, memoryUsage: number): void {
    const recentPerformance = this.performanceHistory.slice(-this.adjustmentThreshold);
    const trend = this.calculateTrend(recentPerformance);

    // If performance is declining, reduce concurrency
    if (trend < -0.1 && this.currentConcurrency > this.minConcurrency) {
      this.currentConcurrency = Math.max(
        this.minConcurrency,
        this.currentConcurrency - 1
      );
      console.log(`Reduced concurrency to ${this.currentConcurrency} due to performance decline`);
    }
    // If performance is improving and resources allow, increase concurrency
    else if (
      trend > 0.1 &&
      this.currentConcurrency < this.maxConcurrency &&
      cpuUsage < 0.8 &&
      memoryUsage < 0.8
    ) {
      this.currentConcurrency = Math.min(
        this.maxConcurrency,
        this.currentConcurrency + 1
      );
      console.log(`Increased concurrency to ${this.currentConcurrency} due to performance improvement`);
    }
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  private memoryThresholdMB: number;
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(memoryThresholdMB = 1000) {
    this.memoryThresholdMB = memoryThresholdMB;
  }

  /**
   * Start memory monitoring and optimization
   */
  start(): void {
    this.gcInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop memory monitoring
   */
  stop(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  /**
   * Force garbage collection if memory usage is high
   */
  private checkMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > this.memoryThresholdMB) {
      console.log(`High memory usage detected: ${Math.round(heapUsedMB)}MB, forcing GC`);
      
      if (global.gc) {
        global.gc();
      } else {
        console.warn('Garbage collection not available. Start node with --expose-gc flag');
      }
    }
  }

  /**
   * Optimize object for memory usage
   */
  static optimizeObject<T extends object>(obj: T): T {
    // Remove undefined properties
    const optimized = {} as T;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        (optimized as any)[key] = value;
      }
    }

    return optimized;
  }

  /**
   * Create memory-efficient string operations
   */
  static createStringBuffer(initialSize = 1024): {
    append: (str: string) => void;
    toString: () => string;
    clear: () => void;
    size: () => number;
  } {
    let buffer = Buffer.alloc(initialSize);
    let length = 0;

    return {
      append: (str: string) => {
        const strBuffer = Buffer.from(str, 'utf8');
        const needed = length + strBuffer.length;
        
        if (needed > buffer.length) {
          // Grow buffer
          const newSize = Math.max(buffer.length * 2, needed);
          const newBuffer = Buffer.alloc(newSize);
          buffer.copy(newBuffer);
          buffer = newBuffer;
        }
        
        strBuffer.copy(buffer, length);
        length += strBuffer.length;
      },
      
      toString: () => {
        return buffer.subarray(0, length).toString('utf8');
      },
      
      clear: () => {
        length = 0;
      },
      
      size: () => length,
    };
  }
}

/**
 * Code preprocessing optimizer
 */
export class CodePreprocessor implements ProcessingOptimizer {
  async optimize(input: string, options: any): Promise<{
    optimizedInput: string;
    strategy: OptimizationStrategy;
    estimatedSpeedup: number;
  }> {
    // Analyze code characteristics
    const analysis = this.analyzeCode(input);
    
    // Choose optimization strategy
    const strategy = this.selectStrategy(analysis, options);
    
    // Apply optimizations
    const optimizedInput = await this.applyOptimizations(input, strategy);
    
    // Estimate performance improvement
    const estimatedSpeedup = this.estimateSpeedup(analysis, strategy);

    return {
      optimizedInput,
      strategy,
      estimatedSpeedup,
    };
  }

  /**
   * Analyze code characteristics
   */
  private analyzeCode(input: string): {
    size: number;
    complexity: number;
    patterns: string[];
    dependencies: string[];
  } {
    const size = input.length;
    
    // Simple complexity estimation
    const cyclomaticComplexity = (input.match(/\bif\b|\bwhile\b|\bfor\b|\bswitch\b/g) || []).length;
    const nestingDepth = this.calculateNestingDepth(input);
    const complexity = cyclomaticComplexity + nestingDepth;

    // Detect common patterns
    const patterns: string[] = [];
    if (input.includes('jQuery') || input.includes('$')) patterns.push('jquery');
    if (input.includes('React') || input.includes('jsx')) patterns.push('react');
    if (input.includes('Vue')) patterns.push('vue');
    if (input.includes('angular')) patterns.push('angular');
    if (input.includes('webpack') || input.includes('__webpack')) patterns.push('webpack');

    // Extract dependencies (simplified)
    const requireMatches = input.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
    const importMatches = input.match(/import.*from\s+['"`]([^'"`]+)['"`]/g) || [];
    const dependencies = [...requireMatches, ...importMatches];

    return {
      size,
      complexity,
      patterns,
      dependencies,
    };
  }

  /**
   * Calculate nesting depth
   */
  private calculateNestingDepth(code: string): number {
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
   * Select optimization strategy
   */
  private selectStrategy(
    analysis: any,
    options: any
  ): OptimizationStrategy {
    // Large files benefit from chunking
    if (analysis.size > 100000) {
      return {
        type: 'chunking',
        parameters: {
          chunkSize: Math.min(50000, analysis.size / 4),
          overlap: 1000,
        },
        reason: 'Large file size detected',
      };
    }

    // High complexity benefits from preprocessing
    if (analysis.complexity > 50) {
      return {
        type: 'preprocessing',
        parameters: {
          simplifyConditionals: true,
          extractFunctions: true,
        },
        reason: 'High code complexity detected',
      };
    }

    // Framework-specific optimizations
    if (analysis.patterns.includes('react')) {
      return {
        type: 'preprocessing',
        parameters: {
          reactOptimizations: true,
          jsxTransform: true,
        },
        reason: 'React framework detected',
      };
    }

    // Default: minimal preprocessing
    return {
      type: 'preprocessing',
      parameters: {
        removeDeadCode: true,
        normalizeWhitespace: true,
      },
      reason: 'Default optimizations',
    };
  }

  /**
   * Apply optimizations based on strategy
   */
  private async applyOptimizations(
    input: string,
    strategy: OptimizationStrategy
  ): Promise<string> {
    let optimized = input;

    switch (strategy.type) {
      case 'preprocessing':
        if (strategy.parameters.removeDeadCode) {
          optimized = this.removeDeadCode(optimized);
        }
        if (strategy.parameters.normalizeWhitespace) {
          optimized = this.normalizeWhitespace(optimized);
        }
        if (strategy.parameters.simplifyConditionals) {
          optimized = this.simplifyConditionals(optimized);
        }
        break;

      case 'chunking':
        // For chunking, we return the original input as the chunking
        // will be handled by the processing pipeline
        break;
    }

    return optimized;
  }

  /**
   * Remove dead code
   */
  private removeDeadCode(code: string): string {
    // Remove unreachable code after return statements
    return code.replace(/return[^}]*?(?=\n\s*[^}])/g, (match) => {
      const lines = match.split('\n');
      return lines[0] || match; // Keep only the return statement
    });
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(code: string): string {
    return code
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/;\s*;/g, ';') // Remove empty statements
      .trim();
  }

  /**
   * Simplify conditional expressions
   */
  private simplifyConditionals(code: string): string {
    return code
      .replace(/if\s*\(\s*true\s*\)\s*{([^}]*)}/g, '$1') // if(true) -> code
      .replace(/if\s*\(\s*false\s*\)\s*{[^}]*}/g, '') // if(false) -> remove
      .replace(/\?\s*true\s*:\s*false/g, '') // ? true : false -> condition
      .replace(/\?\s*false\s*:\s*true/g, '!'); // ? false : true -> !condition
  }

  /**
   * Estimate performance speedup
   */
  private estimateSpeedup(analysis: any, strategy: OptimizationStrategy): number {
    let speedup = 1.0;

    // Base speedup from strategy type
    switch (strategy.type) {
      case 'chunking':
        speedup *= 1.3; // 30% improvement for large files
        break;
      case 'preprocessing':
        speedup *= 1.1; // 10% improvement from preprocessing
        break;
      case 'streaming':
        speedup *= 1.5; // 50% improvement for very large files
        break;
      case 'caching':
        speedup *= 2.0; // 100% improvement if cache hit
        break;
    }

    // Additional speedup based on code characteristics
    if (analysis.complexity > 100) {
      speedup *= 1.2; // Complex code benefits more from optimization
    }

    if (analysis.size > 1000000) {
      speedup *= 1.4; // Very large files benefit significantly
    }

    return Math.min(speedup, 3.0); // Cap at 3x speedup
  }
}

/**
 * Performance monitoring and optimization manager
 */
export class PerformanceManager {
  private config: OptimizationConfig;
  private profiler: PerformanceProfiler;
  private concurrencyOptimizer: ConcurrencyOptimizer;
  private memoryOptimizer: MemoryOptimizer;
  private preprocessor: CodePreprocessor;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enableProfiling: true,
      enableMemoryOptimization: true,
      enableCpuOptimization: true,
      enableIOOptimization: true,
      maxMemoryUsage: 2000, // 2GB
      targetCpuUsage: 0.8,
      adaptiveConcurrency: true,
      enableCodeSplitting: true,
      enableResultCaching: true,
      ...config,
    };

    this.profiler = new PerformanceProfiler();
    this.concurrencyOptimizer = new ConcurrencyOptimizer();
    this.memoryOptimizer = new MemoryOptimizer(this.config.maxMemoryUsage);
    this.preprocessor = new CodePreprocessor();
  }

  /**
   * Initialize performance management
   */
  async initialize(): Promise<void> {
    if (this.config.enableProfiling) {
      this.profiler.start();
    }

    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer.start();
    }

    console.log('Performance management initialized');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics | null {
    if (!this.config.enableProfiling) return null;
    
    try {
      return this.profiler.stop();
    } catch {
      return null;
    }
  }

  /**
   * Get optimal concurrency level
   */
  getOptimalConcurrency(): number {
    if (!this.config.adaptiveConcurrency) {
      return cpus().length;
    }

    return this.concurrencyOptimizer.getConcurrency();
  }

  /**
   * Optimize code for processing
   */
  async optimizeCode(input: string, options: any = {}): Promise<{
    optimizedInput: string;
    strategy: OptimizationStrategy;
    estimatedSpeedup: number;
  }> {
    return await this.preprocessor.optimize(input, options);
  }

  /**
   * Record performance measurement
   */
  recordPerformance(
    throughput: number,
    cpuUsage: number,
    memoryUsage: number
  ): void {
    if (this.config.adaptiveConcurrency) {
      this.concurrencyOptimizer.recordPerformance(throughput, cpuUsage, memoryUsage);
    }

    if (this.config.enableProfiling) {
      this.profiler.recordMetric('throughput', throughput);
      this.profiler.recordMetric('cpu', cpuUsage);
      this.profiler.recordMetric('memory', memoryUsage);
    }
  }

  /**
   * Cleanup performance management
   */
  async cleanup(): Promise<void> {
    this.memoryOptimizer.stop();
    
    console.log('Performance management cleaned up');
  }
}

/**
 * Create performance manager from configuration
 */
export function createPerformanceManager(config: Partial<OptimizationConfig> = {}): PerformanceManager {
  return new PerformanceManager(config);
}