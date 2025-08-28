/**
 * Performance optimization utilities and monitoring
 */
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
    impact: number;
}
export interface OptimizationConfig {
    enableProfiling: boolean;
    enableMemoryOptimization: boolean;
    enableCpuOptimization: boolean;
    enableIOOptimization: boolean;
    maxMemoryUsage: number;
    targetCpuUsage: number;
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
export declare class PerformanceProfiler {
    private startTime;
    private startCpuUsage;
    private startMemoryUsage;
    private metrics;
    private isRunning;
    /**
     * Start profiling
     */
    start(): void;
    /**
     * Stop profiling and return metrics
     */
    stop(): PerformanceMetrics;
    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number): void;
    /**
     * Get average for a metric
     */
    getMetricAverage(name: string): number;
    /**
     * Detect performance bottlenecks
     */
    private detectBottlenecks;
}
/**
 * Adaptive concurrency controller
 */
export declare class ConcurrencyOptimizer {
    private currentConcurrency;
    private minConcurrency;
    private maxConcurrency;
    private performanceHistory;
    private adjustmentThreshold;
    constructor(initialConcurrency?: number, minConcurrency?: number, maxConcurrency?: number);
    /**
     * Get current optimal concurrency level
     */
    getConcurrency(): number;
    /**
     * Record performance measurement and adjust concurrency
     */
    recordPerformance(throughput: number, cpuUsage: number, memoryUsage: number): void;
    /**
     * Adjust concurrency based on performance trends
     */
    private adjustConcurrency;
    /**
     * Calculate performance trend
     */
    private calculateTrend;
}
/**
 * Memory optimization utilities
 */
export declare class MemoryOptimizer {
    private memoryThresholdMB;
    private gcInterval;
    constructor(memoryThresholdMB?: number);
    /**
     * Start memory monitoring and optimization
     */
    start(): void;
    /**
     * Stop memory monitoring
     */
    stop(): void;
    /**
     * Force garbage collection if memory usage is high
     */
    private checkMemoryUsage;
    /**
     * Optimize object for memory usage
     */
    static optimizeObject<T extends object>(obj: T): T;
    /**
     * Create memory-efficient string operations
     */
    static createStringBuffer(initialSize?: number): {
        append: (str: string) => void;
        toString: () => string;
        clear: () => void;
        size: () => number;
    };
}
/**
 * Code preprocessing optimizer
 */
export declare class CodePreprocessor implements ProcessingOptimizer {
    optimize(input: string, options: any): Promise<{
        optimizedInput: string;
        strategy: OptimizationStrategy;
        estimatedSpeedup: number;
    }>;
    /**
     * Analyze code characteristics
     */
    private analyzeCode;
    /**
     * Calculate nesting depth
     */
    private calculateNestingDepth;
    /**
     * Select optimization strategy
     */
    private selectStrategy;
    /**
     * Apply optimizations based on strategy
     */
    private applyOptimizations;
    /**
     * Remove dead code
     */
    private removeDeadCode;
    /**
     * Normalize whitespace
     */
    private normalizeWhitespace;
    /**
     * Simplify conditional expressions
     */
    private simplifyConditionals;
    /**
     * Estimate performance speedup
     */
    private estimateSpeedup;
}
/**
 * Performance monitoring and optimization manager
 */
export declare class PerformanceManager {
    private config;
    private profiler;
    private concurrencyOptimizer;
    private memoryOptimizer;
    private preprocessor;
    constructor(config?: Partial<OptimizationConfig>);
    /**
     * Initialize performance management
     */
    initialize(): Promise<void>;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics | null;
    /**
     * Get optimal concurrency level
     */
    getOptimalConcurrency(): number;
    /**
     * Optimize code for processing
     */
    optimizeCode(input: string, options?: any): Promise<{
        optimizedInput: string;
        strategy: OptimizationStrategy;
        estimatedSpeedup: number;
    }>;
    /**
     * Record performance measurement
     */
    recordPerformance(throughput: number, cpuUsage: number, memoryUsage: number): void;
    /**
     * Cleanup performance management
     */
    cleanup(): Promise<void>;
}
/**
 * Create performance manager from configuration
 */
export declare function createPerformanceManager(config?: Partial<OptimizationConfig>): PerformanceManager;
//# sourceMappingURL=performance.d.ts.map