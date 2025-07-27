/**
 * Plugin validation system
 */

import { PluginMetadata, PluginConfig, PluginType, PluginValidator } from './types.js';

export class DefaultPluginValidator implements PluginValidator {
  /**
   * Validate plugin metadata
   */
  validateMetadata(metadata: PluginMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('Plugin description is required and must be a string');
    }

    if (!metadata.category || !['transformer', 'provider', 'analyzer', 'formatter', 'utility'].includes(metadata.category)) {
      errors.push('Plugin category must be one of: transformer, provider, analyzer, formatter, utility');
    }

    // Validate name format
    if (metadata.name && !/^[a-zA-Z0-9\-_]+$/.test(metadata.name)) {
      errors.push('Plugin name must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate version format (semantic versioning)
    if (metadata.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?$/.test(metadata.version)) {
      errors.push('Plugin version must follow semantic versioning (e.g., 1.0.0)');
    }

    // Validate optional fields
    if (metadata.author !== undefined && typeof metadata.author !== 'string') {
      errors.push('Plugin author must be a string');
    }

    if (metadata.tags !== undefined) {
      if (!Array.isArray(metadata.tags)) {
        errors.push('Plugin tags must be an array');
      } else if (!metadata.tags.every(tag => typeof tag === 'string')) {
        errors.push('All plugin tags must be strings');
      }
    }

    if (metadata.dependencies !== undefined) {
      if (!Array.isArray(metadata.dependencies)) {
        errors.push('Plugin dependencies must be an array');
      } else if (!metadata.dependencies.every(dep => typeof dep === 'string')) {
        errors.push('All plugin dependencies must be strings');
      }
    }

    if (metadata.compatibleVersions !== undefined) {
      if (!Array.isArray(metadata.compatibleVersions)) {
        errors.push('Plugin compatibleVersions must be an array');
      } else if (!metadata.compatibleVersions.every(ver => typeof ver === 'string')) {
        errors.push('All plugin compatible versions must be strings');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin implementation
   */
  validatePlugin(plugin: PluginType): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate metadata
    if (!plugin.metadata) {
      errors.push('Plugin must have metadata');
      return { valid: false, errors };
    }

    const metadataValidation = this.validateMetadata(plugin.metadata);
    if (!metadataValidation.valid) {
      errors.push(...metadataValidation.errors);
    }

    // Validate based on category
    switch (plugin.metadata.category) {
      case 'transformer':
        errors.push(...this.validateTransformerPlugin(plugin));
        break;
      case 'analyzer':
        errors.push(...this.validateAnalyzerPlugin(plugin));
        break;
      case 'provider':
        errors.push(...this.validateProviderPlugin(plugin));
        break;
      default:
        errors.push(`Unknown plugin category: ${plugin.metadata.category}`);
    }

    // Validate optional methods
    if ('init' in plugin && plugin.init && typeof plugin.init !== 'function') {
      errors.push('Plugin init must be a function');
    }

    if ('cleanup' in plugin && plugin.cleanup && typeof plugin.cleanup !== 'function') {
      errors.push('Plugin cleanup must be a function');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate transformer plugin
   */
  private validateTransformerPlugin(plugin: any): string[] {
    const errors: string[] = [];

    if (!plugin.transform || typeof plugin.transform !== 'function') {
      errors.push('Transformer plugin must have a transform function');
    }

    if ('canHandle' in plugin && plugin.canHandle && typeof plugin.canHandle !== 'function') {
      errors.push('Transformer plugin canHandle must be a function');
    }

    return errors;
  }

  /**
   * Validate analyzer plugin
   */
  private validateAnalyzerPlugin(plugin: any): string[] {
    const errors: string[] = [];

    if (!plugin.analyze || typeof plugin.analyze !== 'function') {
      errors.push('Analyzer plugin must have an analyze function');
    }

    return errors;
  }

  /**
   * Validate provider plugin
   */
  private validateProviderPlugin(plugin: any): string[] {
    const errors: string[] = [];

    if (!plugin.isAvailable || typeof plugin.isAvailable !== 'function') {
      errors.push('Provider plugin must have an isAvailable function');
    }

    if (!plugin.process || typeof plugin.process !== 'function') {
      errors.push('Provider plugin must have a process function');
    }

    if (!plugin.getCapabilities || typeof plugin.getCapabilities !== 'function') {
      errors.push('Provider plugin must have a getCapabilities function');
    }

    return errors;
  }

  /**
   * Validate plugin configuration
   */
  validateConfig(config: PluginConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof config.enabled !== 'boolean') {
      errors.push('Plugin config enabled must be a boolean');
    }

    if (typeof config.priority !== 'number' || config.priority < 0 || config.priority > 100) {
      errors.push('Plugin config priority must be a number between 0 and 100');
    }

    if (!config.options || typeof config.options !== 'object') {
      errors.push('Plugin config options must be an object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin security requirements
   */
  validateSecurity(plugin: PluginType, allowedApis: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // This is a simplified security validation
    // In a real implementation, you would analyze the plugin code for:
    // - Dangerous API usage
    // - Network requests to unauthorized domains
    // - File system access outside allowed paths
    // - Code injection attempts

    // Check if plugin metadata declares required APIs
    if (plugin.metadata.dependencies) {
      for (const dependency of plugin.metadata.dependencies) {
        if (!allowedApis.includes(dependency)) {
          errors.push(`Plugin requires unauthorized API: ${dependency}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin compatibility with current system
   */
  validateCompatibility(plugin: PluginType, systemVersion: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (plugin.metadata.compatibleVersions && plugin.metadata.compatibleVersions.length > 0) {
      const isCompatible = plugin.metadata.compatibleVersions.some(version => {
        // Simple version matching - in practice you'd want more sophisticated semver matching
        return version === systemVersion || version === '*';
      });

      if (!isCompatible) {
        errors.push(`Plugin is not compatible with system version ${systemVersion}. Compatible versions: ${plugin.metadata.compatibleVersions.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(plugin: PluginType, availablePlugins: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (plugin.metadata.dependencies) {
      for (const dependency of plugin.metadata.dependencies) {
        if (!availablePlugins.includes(dependency)) {
          errors.push(`Missing required dependency: ${dependency}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Perform comprehensive plugin validation
   */
  validateComprehensive(
    plugin: PluginType,
    allowedApis: string[],
    systemVersion: string,
    availablePlugins: string[]
  ): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[];
    security: boolean;
    compatibility: boolean;
    dependencies: boolean;
  } {
    const allErrors: string[] = [];
    const warnings: string[] = [];

    // Basic plugin validation
    const basicValidation = this.validatePlugin(plugin);
    allErrors.push(...basicValidation.errors);

    // Security validation
    const securityValidation = this.validateSecurity(plugin, allowedApis);
    allErrors.push(...securityValidation.errors);
    const securityValid = securityValidation.valid;

    // Compatibility validation
    const compatibilityValidation = this.validateCompatibility(plugin, systemVersion);
    allErrors.push(...compatibilityValidation.errors);
    const compatibilityValid = compatibilityValidation.valid;

    // Dependencies validation
    const dependenciesValidation = this.validateDependencies(plugin, availablePlugins);
    allErrors.push(...dependenciesValidation.errors);
    const dependenciesValid = dependenciesValidation.valid;

    // Generate warnings for potential issues
    if (plugin.metadata.description.length < 10) {
      warnings.push('Plugin description is very short - consider providing more details');
    }

    if (!plugin.metadata.author) {
      warnings.push('Plugin author not specified');
    }

    if (!plugin.metadata.tags || plugin.metadata.tags.length === 0) {
      warnings.push('Plugin has no tags - consider adding tags for better discoverability');
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings,
      security: securityValid,
      compatibility: compatibilityValid,
      dependencies: dependenciesValid,
    };
  }
}