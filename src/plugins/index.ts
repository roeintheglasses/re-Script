/**
 * Plugin system exports
 */

export * from './types.js';
export * from './manager.js';
export * from './validator.js';

// Example plugins
export { prettierTransformerPlugin } from './examples/prettier-transformer.js';
export { complexityAnalyzerPlugin } from './examples/complexity-analyzer.js';
export { localLlmProviderPlugin } from './examples/local-llm-provider.js';

// Re-export for convenience
export { PluginManager } from './manager.js';
export { DefaultPluginValidator } from './validator.js';