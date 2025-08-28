/**
 * Configuration schema validation using Zod
 */
import { z } from 'zod';
export declare const reScriptConfigSchema: z.ZodObject<{
    provider: z.ZodObject<{
        name: z.ZodEnum<["openai", "anthropic", "ollama", "azure", "bedrock"]>;
        model: z.ZodString;
        apiKey: z.ZodOptional<z.ZodString>;
        baseUrl: z.ZodOptional<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: "openai" | "anthropic" | "ollama" | "azure" | "bedrock";
        model: string;
        temperature: number;
        maxTokens: number;
        timeout: number;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
    }, {
        name: "openai" | "anthropic" | "ollama" | "azure" | "bedrock";
        model: string;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    }>;
    processing: z.ZodDefault<z.ZodObject<{
        chunking: z.ZodDefault<z.ZodObject<{
            strategy: z.ZodDefault<z.ZodEnum<["simple", "ast-aware", "semantic"]>>;
            maxChunkSize: z.ZodDefault<z.ZodNumber>;
            overlapPercentage: z.ZodDefault<z.ZodNumber>;
            respectFunctionBoundaries: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        }, {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        }>>;
        caching: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            ttl: z.ZodDefault<z.ZodNumber>;
            backend: z.ZodDefault<z.ZodEnum<["memory", "file", "redis"]>>;
            maxSize: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        }, {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        }>>;
        retries: z.ZodDefault<z.ZodObject<{
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            backoffFactor: z.ZodDefault<z.ZodNumber>;
            maxDelay: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        }, {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        }>>;
        concurrency: z.ZodDefault<z.ZodNumber>;
        preserveComments: z.ZodDefault<z.ZodBoolean>;
        preserveSourceMaps: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        chunking: {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        };
        caching: {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        };
        retries: {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        };
        concurrency: number;
        preserveComments: boolean;
        preserveSourceMaps: boolean;
    }, {
        chunking?: {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        } | undefined;
        caching?: {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        } | undefined;
        retries?: {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    }>>;
    output: z.ZodDefault<z.ZodObject<{
        format: z.ZodDefault<z.ZodEnum<["prettier", "custom"]>>;
        prettierOptions: z.ZodDefault<z.ZodObject<{
            parser: z.ZodDefault<z.ZodString>;
            printWidth: z.ZodDefault<z.ZodNumber>;
            tabWidth: z.ZodDefault<z.ZodNumber>;
            useTabs: z.ZodDefault<z.ZodBoolean>;
            semi: z.ZodDefault<z.ZodBoolean>;
            singleQuote: z.ZodDefault<z.ZodBoolean>;
            trailingComma: z.ZodDefault<z.ZodEnum<["none", "es5", "all"]>>;
        }, "strip", z.ZodTypeAny, {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        }, {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        }>>;
        generateSourceMaps: z.ZodDefault<z.ZodBoolean>;
        addComments: z.ZodDefault<z.ZodBoolean>;
        commentStyle: z.ZodDefault<z.ZodEnum<["block", "line"]>>;
    }, "strip", z.ZodTypeAny, {
        format: "custom" | "prettier";
        prettierOptions: {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        };
        generateSourceMaps: boolean;
        addComments: boolean;
        commentStyle: "block" | "line";
    }, {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    }>>;
    advanced: z.ZodDefault<z.ZodObject<{
        enablePlugins: z.ZodDefault<z.ZodBoolean>;
        pluginPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        pluginConfig: z.ZodDefault<z.ZodObject<{
            discovery: z.ZodDefault<z.ZodObject<{
                paths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                patterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            }, {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            }>>;
            security: z.ZodDefault<z.ZodObject<{
                allowedApis: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                timeoutMs: z.ZodDefault<z.ZodNumber>;
                memoryLimitMB: z.ZodDefault<z.ZodNumber>;
                networkAccess: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            }, {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            }>>;
            execution: z.ZodDefault<z.ZodObject<{
                hooks: z.ZodDefault<z.ZodObject<{
                    beforeTransform: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    afterTransform: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    beforeAnalysis: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    afterAnalysis: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    onError: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                }, {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                }>>;
                chains: z.ZodDefault<z.ZodObject<{
                    transformers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    analyzers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    transformers: string[];
                    analyzers: string[];
                }, {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                }>>;
                configs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    priority: z.ZodDefault<z.ZodNumber>;
                    options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, "strip", z.ZodTypeAny, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            }, {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        }, {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        }>>;
        experimentalFeatures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        debugMode: z.ZodDefault<z.ZodBoolean>;
        logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    }, "strip", z.ZodTypeAny, {
        enablePlugins: boolean;
        pluginPaths: string[];
        pluginConfig: {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        };
        experimentalFeatures: string[];
        debugMode: boolean;
        logLevel: "error" | "warn" | "info" | "debug";
    }, {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    provider: {
        name: "openai" | "anthropic" | "ollama" | "azure" | "bedrock";
        model: string;
        temperature: number;
        maxTokens: number;
        timeout: number;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
    };
    processing: {
        chunking: {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        };
        caching: {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        };
        retries: {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        };
        concurrency: number;
        preserveComments: boolean;
        preserveSourceMaps: boolean;
    };
    output: {
        format: "custom" | "prettier";
        prettierOptions: {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        };
        generateSourceMaps: boolean;
        addComments: boolean;
        commentStyle: "block" | "line";
    };
    advanced: {
        enablePlugins: boolean;
        pluginPaths: string[];
        pluginConfig: {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        };
        experimentalFeatures: string[];
        debugMode: boolean;
        logLevel: "error" | "warn" | "info" | "debug";
    };
}, {
    provider: {
        name: "openai" | "anthropic" | "ollama" | "azure" | "bedrock";
        model: string;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    };
    processing?: {
        chunking?: {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        } | undefined;
        caching?: {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        } | undefined;
        retries?: {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    } | undefined;
    output?: {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    } | undefined;
    advanced?: {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    } | undefined;
}>;
export declare const partialConfigSchema: z.ZodObject<{
    provider: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodEnum<["openai", "anthropic", "ollama", "azure", "bedrock"]>>;
        model: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        baseUrl: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        temperature: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        maxTokens: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        timeout: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        name?: "openai" | "anthropic" | "ollama" | "azure" | "bedrock" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    }, {
        name?: "openai" | "anthropic" | "ollama" | "azure" | "bedrock" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    }>>>;
    processing: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        chunking: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            strategy: z.ZodDefault<z.ZodEnum<["simple", "ast-aware", "semantic"]>>;
            maxChunkSize: z.ZodDefault<z.ZodNumber>;
            overlapPercentage: z.ZodDefault<z.ZodNumber>;
            respectFunctionBoundaries: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        }, {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        }>>>;
        caching: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            ttl: z.ZodDefault<z.ZodNumber>;
            backend: z.ZodDefault<z.ZodEnum<["memory", "file", "redis"]>>;
            maxSize: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        }, {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        }>>>;
        retries: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            backoffFactor: z.ZodDefault<z.ZodNumber>;
            maxDelay: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        }, {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        }>>>;
        concurrency: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        preserveComments: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        preserveSourceMaps: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        chunking?: {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        } | undefined;
        caching?: {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        } | undefined;
        retries?: {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    }, {
        chunking?: {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        } | undefined;
        caching?: {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        } | undefined;
        retries?: {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    }>>>;
    output: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        format: z.ZodOptional<z.ZodDefault<z.ZodEnum<["prettier", "custom"]>>>;
        prettierOptions: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            parser: z.ZodDefault<z.ZodString>;
            printWidth: z.ZodDefault<z.ZodNumber>;
            tabWidth: z.ZodDefault<z.ZodNumber>;
            useTabs: z.ZodDefault<z.ZodBoolean>;
            semi: z.ZodDefault<z.ZodBoolean>;
            singleQuote: z.ZodDefault<z.ZodBoolean>;
            trailingComma: z.ZodDefault<z.ZodEnum<["none", "es5", "all"]>>;
        }, "strip", z.ZodTypeAny, {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        }, {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        }>>>;
        generateSourceMaps: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        addComments: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        commentStyle: z.ZodOptional<z.ZodDefault<z.ZodEnum<["block", "line"]>>>;
    }, "strip", z.ZodTypeAny, {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    }, {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    }>>>;
    advanced: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        enablePlugins: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        pluginPaths: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        pluginConfig: z.ZodOptional<z.ZodDefault<z.ZodObject<{
            discovery: z.ZodDefault<z.ZodObject<{
                paths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                patterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            }, {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            }>>;
            security: z.ZodDefault<z.ZodObject<{
                allowedApis: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                timeoutMs: z.ZodDefault<z.ZodNumber>;
                memoryLimitMB: z.ZodDefault<z.ZodNumber>;
                networkAccess: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            }, {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            }>>;
            execution: z.ZodDefault<z.ZodObject<{
                hooks: z.ZodDefault<z.ZodObject<{
                    beforeTransform: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    afterTransform: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    beforeAnalysis: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    afterAnalysis: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    onError: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                }, {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                }>>;
                chains: z.ZodDefault<z.ZodObject<{
                    transformers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    analyzers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    transformers: string[];
                    analyzers: string[];
                }, {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                }>>;
                configs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    priority: z.ZodDefault<z.ZodNumber>;
                    options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                }, "strip", z.ZodTypeAny, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            }, {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        }, {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        }>>>;
        experimentalFeatures: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        debugMode: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        logLevel: z.ZodOptional<z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>>;
    }, "strip", z.ZodTypeAny, {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    }, {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    provider?: {
        name?: "openai" | "anthropic" | "ollama" | "azure" | "bedrock" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    } | undefined;
    processing?: {
        chunking?: {
            strategy: "simple" | "ast-aware" | "semantic";
            maxChunkSize: number;
            overlapPercentage: number;
            respectFunctionBoundaries: boolean;
        } | undefined;
        caching?: {
            enabled: boolean;
            ttl: number;
            backend: "memory" | "file" | "redis";
            maxSize: number;
        } | undefined;
        retries?: {
            maxAttempts: number;
            backoffFactor: number;
            maxDelay: number;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    } | undefined;
    output?: {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser: string;
            printWidth: number;
            tabWidth: number;
            useTabs: boolean;
            semi: boolean;
            singleQuote: boolean;
            trailingComma: "none" | "es5" | "all";
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    } | undefined;
    advanced?: {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery: {
                paths: string[];
                patterns: string[];
                excludePatterns?: string[] | undefined;
            };
            security: {
                allowedApis: string[];
                allowedPaths: string[];
                timeoutMs: number;
                memoryLimitMB: number;
                networkAccess: boolean;
            };
            execution: {
                hooks: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                };
                chains: {
                    transformers: string[];
                    analyzers: string[];
                };
                configs: Record<string, {
                    options: Record<string, unknown>;
                    enabled: boolean;
                    priority: number;
                }>;
            };
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    } | undefined;
}, {
    provider?: {
        name?: "openai" | "anthropic" | "ollama" | "azure" | "bedrock" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
        baseUrl?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeout?: number | undefined;
    } | undefined;
    processing?: {
        chunking?: {
            strategy?: "simple" | "ast-aware" | "semantic" | undefined;
            maxChunkSize?: number | undefined;
            overlapPercentage?: number | undefined;
            respectFunctionBoundaries?: boolean | undefined;
        } | undefined;
        caching?: {
            enabled?: boolean | undefined;
            ttl?: number | undefined;
            backend?: "memory" | "file" | "redis" | undefined;
            maxSize?: number | undefined;
        } | undefined;
        retries?: {
            maxAttempts?: number | undefined;
            backoffFactor?: number | undefined;
            maxDelay?: number | undefined;
        } | undefined;
        concurrency?: number | undefined;
        preserveComments?: boolean | undefined;
        preserveSourceMaps?: boolean | undefined;
    } | undefined;
    output?: {
        format?: "custom" | "prettier" | undefined;
        prettierOptions?: {
            parser?: string | undefined;
            printWidth?: number | undefined;
            tabWidth?: number | undefined;
            useTabs?: boolean | undefined;
            semi?: boolean | undefined;
            singleQuote?: boolean | undefined;
            trailingComma?: "none" | "es5" | "all" | undefined;
        } | undefined;
        generateSourceMaps?: boolean | undefined;
        addComments?: boolean | undefined;
        commentStyle?: "block" | "line" | undefined;
    } | undefined;
    advanced?: {
        enablePlugins?: boolean | undefined;
        pluginPaths?: string[] | undefined;
        pluginConfig?: {
            discovery?: {
                paths?: string[] | undefined;
                patterns?: string[] | undefined;
                excludePatterns?: string[] | undefined;
            } | undefined;
            security?: {
                allowedApis?: string[] | undefined;
                allowedPaths?: string[] | undefined;
                timeoutMs?: number | undefined;
                memoryLimitMB?: number | undefined;
                networkAccess?: boolean | undefined;
            } | undefined;
            execution?: {
                hooks?: {
                    beforeTransform?: string[] | undefined;
                    afterTransform?: string[] | undefined;
                    beforeAnalysis?: string[] | undefined;
                    afterAnalysis?: string[] | undefined;
                    onError?: string[] | undefined;
                } | undefined;
                chains?: {
                    transformers?: string[] | undefined;
                    analyzers?: string[] | undefined;
                } | undefined;
                configs?: Record<string, {
                    options?: Record<string, unknown> | undefined;
                    enabled?: boolean | undefined;
                    priority?: number | undefined;
                }> | undefined;
            } | undefined;
        } | undefined;
        experimentalFeatures?: string[] | undefined;
        debugMode?: boolean | undefined;
        logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    } | undefined;
}>;
export declare const cliOptionsSchema: z.ZodObject<{
    input: z.ZodString;
    output: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    concurrency: z.ZodOptional<z.ZodNumber>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    watch: z.ZodDefault<z.ZodBoolean>;
    recursive: z.ZodDefault<z.ZodBoolean>;
    pattern: z.ZodOptional<z.ZodString>;
    exclude: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    verbose: z.ZodDefault<z.ZodBoolean>;
    quiet: z.ZodDefault<z.ZodBoolean>;
    force: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    input: string;
    dryRun: boolean;
    watch: boolean;
    recursive: boolean;
    exclude: string[];
    verbose: boolean;
    quiet: boolean;
    force: boolean;
    model?: string | undefined;
    apiKey?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    concurrency?: number | undefined;
    provider?: string | undefined;
    output?: string | undefined;
    config?: string | undefined;
    pattern?: string | undefined;
}, {
    input: string;
    model?: string | undefined;
    apiKey?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    concurrency?: number | undefined;
    provider?: string | undefined;
    output?: string | undefined;
    config?: string | undefined;
    dryRun?: boolean | undefined;
    watch?: boolean | undefined;
    recursive?: boolean | undefined;
    pattern?: string | undefined;
    exclude?: string[] | undefined;
    verbose?: boolean | undefined;
    quiet?: boolean | undefined;
    force?: boolean | undefined;
}>;
export declare const jobInputSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodString, "many">;
    options: z.ZodDefault<z.ZodObject<{
        outputDir: z.ZodOptional<z.ZodString>;
        recursive: z.ZodDefault<z.ZodBoolean>;
        pattern: z.ZodOptional<z.ZodString>;
        exclude: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        recursive: boolean;
        exclude: string[];
        pattern?: string | undefined;
        outputDir?: string | undefined;
    }, {
        recursive?: boolean | undefined;
        pattern?: string | undefined;
        exclude?: string[] | undefined;
        outputDir?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    options: {
        recursive: boolean;
        exclude: string[];
        pattern?: string | undefined;
        outputDir?: string | undefined;
    };
    files: string[];
}, {
    files: string[];
    options?: {
        recursive?: boolean | undefined;
        pattern?: string | undefined;
        exclude?: string[] | undefined;
        outputDir?: string | undefined;
    } | undefined;
}>;
export type ReScriptConfig = z.infer<typeof reScriptConfigSchema>;
export type PartialConfig = z.infer<typeof partialConfigSchema>;
export type CliOptions = z.infer<typeof cliOptionsSchema>;
export type JobInput = z.infer<typeof jobInputSchema>;
export declare const defaultConfig: ReScriptConfig;
export declare function validateConfig(config: unknown): ReScriptConfig;
export declare function validatePartialConfig(config: unknown): PartialConfig;
export declare function validateCliOptions(options: unknown): CliOptions;
export declare function validateJobInput(input: unknown): JobInput;
export declare function mergeConfig(base: ReScriptConfig, override: PartialConfig): ReScriptConfig;
export declare const envVarMapping: {
    readonly RESCRIPT_PROVIDER: "provider.name";
    readonly RESCRIPT_MODEL: "provider.model";
    readonly OPENAI_API_KEY: "provider.apiKey";
    readonly ANTHROPIC_API_KEY: "provider.apiKey";
    readonly OLLAMA_BASE_URL: "provider.baseUrl";
    readonly RESCRIPT_TEMPERATURE: "provider.temperature";
    readonly RESCRIPT_MAX_TOKENS: "provider.maxTokens";
    readonly RESCRIPT_CONCURRENCY: "processing.concurrency";
    readonly RESCRIPT_DEBUG: "advanced.debugMode";
    readonly RESCRIPT_LOG_LEVEL: "advanced.logLevel";
};
//# sourceMappingURL=schema.d.ts.map