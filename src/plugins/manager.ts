/**
 * Plugin manager for loading and orchestrating plugins
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join, resolve, extname } from 'path';
import { pathToFileURL } from 'url';
import { ReScriptError, ErrorCode } from '../utils/errors.js';
import { CacheManager } from '../utils/cache.js';
import {
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginRegistry,
  PluginLoadResult,
  PluginDiscovery,
  PluginExecution,
  PluginChain,
  PluginHooks,
  PluginType,
  PluginValidator,
  PluginSecurity,
  TransformerPlugin,
  AnalyzerPlugin,
  ProviderPlugin,
  PluginUtils,
  ConditionalRule
} from './types.js';
import { ReScriptConfig, JobInput } from '../types.js';

export class PluginManager {
  private registry: PluginRegistry;
  private configs: Map<string, PluginConfig>;
  private discovery: PluginDiscovery;
  private validator: PluginValidator;
  private security: PluginSecurity;
  private cacheManager?: CacheManager;
  private hooks: PluginHooks;
  private executions: PluginExecution[] = [];

  constructor(
    discovery: PluginDiscovery,
    validator: PluginValidator,
    security: PluginSecurity,
    cacheManager?: CacheManager
  ) {
    this.registry = {
      transformers: new Map(),
      analyzers: new Map(),
      providers: new Map(),
    };
    this.configs = new Map();
    this.discovery = discovery;
    this.validator = validator;
    this.security = security;
    this.cacheManager = cacheManager;
    this.hooks = {};
  }

  /**
   * Initialize plugin manager and discover plugins
   */
  async initialize(): Promise<void> {
    try {
      const discoveredPlugins = await this.discoverPlugins();
      
      for (const pluginPath of discoveredPlugins) {
        const result = await this.loadPlugin(pluginPath);
        
        if (!result.success) {
          console.warn(`Failed to load plugin ${pluginPath}: ${result.error}`);
          continue;
        }

        if (result.warnings?.length) {
          result.warnings.forEach(warning => 
            console.warn(`Plugin ${pluginPath}: ${warning}`)
          );
        }
      }

      console.log(`Loaded ${this.getTotalPluginCount()} plugins:`);
      console.log(`  Transformers: ${this.registry.transformers.size}`);
      console.log(`  Analyzers: ${this.registry.analyzers.size}`);
      console.log(`  Providers: ${this.registry.providers.size}`);

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.PLUGIN_ERROR,
        `Failed to initialize plugin manager: ${error instanceof Error ? error.message : String(error)}`,
        'plugin-init'
      );
    }
  }

  /**
   * Discover plugins from configured paths
   */
  private async discoverPlugins(): Promise<string[]> {
    const plugins: string[] = [];

    for (const searchPath of this.discovery.paths) {
      try {
        const resolvedPath = resolve(searchPath);
        const pluginsInPath = await this.scanDirectory(resolvedPath);
        plugins.push(...pluginsInPath);
      } catch (error) {
        console.warn(`Failed to scan plugin path ${searchPath}: ${error}`);
      }
    }

    return [...new Set(plugins)]; // Remove duplicates
  }

  /**
   * Scan directory for plugin files
   */
  private async scanDirectory(dirPath: string): Promise<string[]> {
    const plugins: string[] = [];

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Check for package.json or index file
          const packagePath = join(fullPath, 'package.json');
          const indexPaths = [
            join(fullPath, 'index.js'),
            join(fullPath, 'index.mjs'),
            join(fullPath, 'index.ts'),
          ];

          try {
            await stat(packagePath);
            plugins.push(fullPath);
            continue;
          } catch {
            // No package.json, check for index files
          }

          for (const indexPath of indexPaths) {
            try {
              await stat(indexPath);
              plugins.push(indexPath);
              break;
            } catch {
              // Continue to next index file
            }
          }
        } else if (entry.isFile()) {
          // Check if file matches plugin patterns
          const ext = extname(entry.name);
          const validExtensions = ['.js', '.mjs', '.ts'];
          
          if (validExtensions.includes(ext) && this.matchesPatterns(entry.name)) {
            plugins.push(fullPath);
          }
        }
      }
    } catch (error) {
      throw new ReScriptError(
        ErrorCode.PLUGIN_ERROR,
        `Failed to scan directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
        'plugin-discovery'
      );
    }

    return plugins;
  }

  /**
   * Check if filename matches discovery patterns
   */
  private matchesPatterns(filename: string): boolean {
    // Check include patterns
    const includeMatch = this.discovery.patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    });

    if (!includeMatch) return false;

    // Check exclude patterns
    if (this.discovery.excludePatterns) {
      const excludeMatch = this.discovery.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      });

      if (excludeMatch) return false;
    }

    return true;
  }

  /**
   * Load a single plugin
   */
  private async loadPlugin(pluginPath: string): Promise<PluginLoadResult> {
    try {
      // Check cache first
      const cacheKey = `plugin:${pluginPath}`;
      if (this.cacheManager) {
        const cached = await this.cacheManager.get<PluginLoadResult>(cacheKey);
        if (cached) return cached;
      }

      let pluginModule: any;

      if (pluginPath.endsWith('package.json') || await this.isDirectory(pluginPath)) {
        // Load as npm package
        pluginModule = await this.loadPackagePlugin(pluginPath);
      } else {
        // Load as ES module
        const fileUrl = pathToFileURL(pluginPath).href;
        pluginModule = await import(fileUrl);
      }

      const plugin: PluginType = pluginModule.default || pluginModule;

      // Validate plugin
      const validation = this.validator.validatePlugin(plugin);
      if (!validation.valid) {
        const result: PluginLoadResult = {
          success: false,
          error: `Plugin validation failed: ${validation.errors.join(', ')}`,
        };

        if (this.cacheManager) {
          await this.cacheManager.set(cacheKey, result, 300); // Cache failures for 5 minutes
        }

        return result;
      }

      // Register plugin
      await this.registerPlugin(plugin);

      const result: PluginLoadResult = {
        success: true,
        plugin,
      };

      if (this.cacheManager) {
        await this.cacheManager.set(cacheKey, result, 3600); // Cache for 1 hour
      }

      return result;

    } catch (error) {
      const result: PluginLoadResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      return result;
    }
  }

  /**
   * Load plugin from package directory
   */
  private async loadPackagePlugin(packagePath: string): Promise<any> {
    const packageJsonPath = packagePath.endsWith('package.json') 
      ? packagePath 
      : join(packagePath, 'package.json');

    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    const main = packageJson.main || 'index.js';
    const pluginFile = join(packagePath.replace(/package\.json$/, ''), main);

    const fileUrl = pathToFileURL(pluginFile).href;
    return await import(fileUrl);
  }

  /**
   * Check if path is a directory
   */
  private async isDirectory(path: string): Promise<boolean> {
    try {
      const stats = await stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Register a plugin in the appropriate registry
   */
  private async registerPlugin(plugin: PluginType): Promise<void> {
    const { name, category } = plugin.metadata;

    switch (category) {
      case 'transformer':
        this.registry.transformers.set(name, plugin as TransformerPlugin);
        break;
      case 'analyzer':
        this.registry.analyzers.set(name, plugin as AnalyzerPlugin);
        break;
      case 'provider':
        this.registry.providers.set(name, plugin as ProviderPlugin);
        break;
      default:
        throw new ReScriptError(
          ErrorCode.PLUGIN_ERROR,
          `Unknown plugin category: ${category}`,
          'plugin-registration'
        );
    }

    // Initialize plugin if it has init method
    if ('init' in plugin && typeof plugin.init === 'function') {
      const context = await this.createPluginContext(plugin.metadata, {
        filePath: '',
        content: '',
        size: 0,
      });

      await plugin.init(context);
    }
  }

  /**
   * Execute transformer plugins in chain
   */
  async executeTransformers(
    input: string,
    config: ReScriptConfig,
    jobInput: JobInput,
    chain?: PluginChain
  ): Promise<string> {
    const transformers = chain?.plugins || Array.from(this.registry.transformers.keys());
    let result = input;

    // Execute before transform hooks
    if (this.hooks.beforeTransform) {
      await this.executeHooks(this.hooks.beforeTransform, input, config, jobInput);
    }

    try {
      for (const transformerName of transformers) {
        const transformer = this.registry.transformers.get(transformerName);
        if (!transformer) {
          console.warn(`Transformer plugin not found: ${transformerName}`);
          continue;
        }

        const pluginConfig = this.configs.get(transformerName);
        if (pluginConfig && !pluginConfig.enabled) {
          continue; // Skip disabled plugins
        }

        const execution = this.startExecution(transformerName);

        try {
          const context = await this.createPluginContext(transformer.metadata, jobInput);

          // Check if plugin can handle this input
          if (transformer.canHandle) {
            const canHandle = await transformer.canHandle(result, context);
            if (!canHandle) {
              this.completeExecution(execution, true);
              continue;
            }
          }

          result = await transformer.transform(result, context);
          this.completeExecution(execution, true);

        } catch (error) {
          this.completeExecution(execution, false, error instanceof Error ? error.message : String(error));
          
          if (!chain?.continueOnError) {
            throw error;
          }
          
          console.warn(`Transformer ${transformerName} failed: ${error}`);
        }
      }

      // Execute after transform hooks
      if (this.hooks.afterTransform) {
        await this.executeHooks(this.hooks.afterTransform, result, config, jobInput);
      }

      return result;

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.PLUGIN_ERROR,
        `Transformer chain execution failed: ${error instanceof Error ? error.message : String(error)}`,
        'plugin-execution'
      );
    }
  }

  /**
   * Execute analyzer plugins
   */
  async executeAnalyzers(
    input: string,
    config: ReScriptConfig,
    jobInput: JobInput,
    analyzerNames?: string[]
  ): Promise<Record<string, any>> {
    const analyzers = analyzerNames || Array.from(this.registry.analyzers.keys());
    const results: Record<string, any> = {};

    // Execute before analysis hooks
    if (this.hooks.beforeAnalysis) {
      await this.executeHooks(this.hooks.beforeAnalysis, input, config, jobInput);
    }

    for (const analyzerName of analyzers) {
      const analyzer = this.registry.analyzers.get(analyzerName);
      if (!analyzer) {
        console.warn(`Analyzer plugin not found: ${analyzerName}`);
        continue;
      }

      const pluginConfig = this.configs.get(analyzerName);
      if (pluginConfig && !pluginConfig.enabled) {
        continue;
      }

      const execution = this.startExecution(analyzerName);

      try {
        const context = await this.createPluginContext(analyzer.metadata, jobInput);
        results[analyzerName] = await analyzer.analyze(input, context);
        this.completeExecution(execution, true);

      } catch (error) {
        this.completeExecution(execution, false, error instanceof Error ? error.message : String(error));
        console.warn(`Analyzer ${analyzerName} failed: ${error}`);
      }
    }

    // Execute after analysis hooks
    if (this.hooks.afterAnalysis) {
      await this.executeHooks(this.hooks.afterAnalysis, input, config, jobInput);
    }

    return results;
  }

  /**
   * Execute hooks
   */
  private async executeHooks(
    hookPlugins: string[],
    input: string,
    config: ReScriptConfig,
    jobInput: JobInput
  ): Promise<void> {
    for (const pluginName of hookPlugins) {
      // Find plugin in any registry
      const plugin = this.registry.transformers.get(pluginName) ||
                   this.registry.analyzers.get(pluginName) ||
                   this.registry.providers.get(pluginName);

      if (plugin && 'transform' in plugin) {
        try {
          const context = await this.createPluginContext(plugin.metadata, jobInput);
          await plugin.transform(input, context);
        } catch (error) {
          console.warn(`Hook plugin ${pluginName} failed: ${error}`);
        }
      }
    }
  }

  /**
   * Create plugin context
   */
  private async createPluginContext(
    metadata: PluginMetadata,
    jobInput: JobInput
  ): Promise<PluginContext> {
    const utils: PluginUtils = {
      log: (level, message) => {
        console.log(`[${metadata.name}] ${level.toUpperCase()}: ${message}`);
      },
      cache: {
        get: async <T>(key: string) => {
          if (!this.cacheManager) return null;
          return await this.cacheManager.get<T>(`plugin:${metadata.name}:${key}`);
        },
        set: async <T>(key: string, value: T, ttl?: number) => {
          if (!this.cacheManager) return;
          await this.cacheManager.set(`plugin:${metadata.name}:${key}`, value);
        },
        delete: async (key: string) => {
          if (!this.cacheManager) return;
          await this.cacheManager.delete(`plugin:${metadata.name}:${key}`);
        },
      },
      fs: {
        readFile: async (path: string) => {
          // Security check - validate path is allowed
          if (!this.isPathAllowed(path, this.security.permissions.fileSystem.read)) {
            throw new ReScriptError(
              ErrorCode.PLUGIN_ERROR,
              `Plugin ${metadata.name} attempted to read unauthorized path: ${path}`,
              'plugin-security'
            );
          }
          return await readFile(path, 'utf8');
        },
        writeFile: async (path: string, content: string) => {
          if (!this.isPathAllowed(path, this.security.permissions.fileSystem.write)) {
            throw new ReScriptError(
              ErrorCode.PLUGIN_ERROR,
              `Plugin ${metadata.name} attempted to write to unauthorized path: ${path}`,
              'plugin-security'
            );
          }
          const { writeFile } = await import('fs/promises');
          await writeFile(path, content, 'utf8');
        },
        exists: async (path: string) => {
          try {
            await stat(path);
            return true;
          } catch {
            return false;
          }
        },
      },
    };

    return {
      config: {} as ReScriptConfig, // Will be set by caller
      input: jobInput,
      metadata: {},
      utils,
    };
  }

  /**
   * Check if path is allowed for plugin access
   */
  private isPathAllowed(path: string, allowedPaths: string[]): boolean {
    const resolvedPath = resolve(path);
    
    return allowedPaths.some(allowedPath => {
      const resolvedAllowed = resolve(allowedPath);
      return resolvedPath.startsWith(resolvedAllowed);
    });
  }

  /**
   * Start plugin execution tracking
   */
  private startExecution(pluginName: string): PluginExecution {
    const execution: PluginExecution = {
      plugin: pluginName,
      startTime: new Date(),
      success: false,
    };

    this.executions.push(execution);
    return execution;
  }

  /**
   * Complete plugin execution tracking
   */
  private completeExecution(execution: PluginExecution, success: boolean, error?: string): void {
    execution.endTime = new Date();
    execution.success = success;
    if (error) {
      execution.error = error;
    }
  }

  /**
   * Configure plugin
   */
  setPluginConfig(pluginName: string, config: PluginConfig): void {
    const validation = this.validator.validateConfig(config);
    if (!validation.valid) {
      throw new ReScriptError(
        ErrorCode.PLUGIN_ERROR,
        `Invalid plugin config: ${validation.errors.join(', ')}`,
        'plugin-config'
      );
    }

    this.configs.set(pluginName, config);
  }

  /**
   * Set plugin hooks
   */
  setHooks(hooks: PluginHooks): void {
    this.hooks = hooks;
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): PluginType | undefined {
    return this.registry.transformers.get(name) ||
           this.registry.analyzers.get(name) ||
           this.registry.providers.get(name);
  }

  /**
   * List all plugins
   */
  listPlugins(): { transformers: string[]; analyzers: string[]; providers: string[] } {
    return {
      transformers: Array.from(this.registry.transformers.keys()),
      analyzers: Array.from(this.registry.analyzers.keys()),
      providers: Array.from(this.registry.providers.keys()),
    };
  }

  /**
   * Get plugin execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    executionsByPlugin: Record<string, number>;
  } {
    const stats = {
      totalExecutions: this.executions.length,
      successfulExecutions: this.executions.filter(e => e.success).length,
      failedExecutions: this.executions.filter(e => !e.success).length,
      executionsByPlugin: {} as Record<string, number>,
    };

    for (const execution of this.executions) {
      stats.executionsByPlugin[execution.plugin] = 
        (stats.executionsByPlugin[execution.plugin] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get total plugin count
   */
  private getTotalPluginCount(): number {
    return this.registry.transformers.size + 
           this.registry.analyzers.size + 
           this.registry.providers.size;
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const cleanupPromises: Promise<void>[] = [];

    // Cleanup transformers
    for (const transformer of this.registry.transformers.values()) {
      if (transformer.cleanup) {
        const context = await this.createPluginContext(transformer.metadata, {
          filePath: '',
          content: '',
          size: 0,
        });
        cleanupPromises.push(transformer.cleanup(context));
      }
    }

    // Cleanup analyzers
    for (const analyzer of this.registry.analyzers.values()) {
      if (analyzer.cleanup) {
        const context = await this.createPluginContext(analyzer.metadata, {
          filePath: '',
          content: '',
          size: 0,
        });
        cleanupPromises.push(analyzer.cleanup(context));
      }
    }

    // Cleanup providers
    for (const provider of this.registry.providers.values()) {
      if (provider.cleanup) {
        const context = await this.createPluginContext(provider.metadata, {
          filePath: '',
          content: '',
          size: 0,
        });
        cleanupPromises.push(provider.cleanup(context));
      }
    }

    await Promise.all(cleanupPromises);
  }
}