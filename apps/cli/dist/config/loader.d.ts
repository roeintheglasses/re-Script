/**
 * Configuration loading and management
 */
import { ReScriptConfig, PartialConfig } from './schema.js';
export declare class ConfigLoader {
    private explorer;
    /**
     * Load configuration from files and environment variables
     */
    loadConfig(configPath?: string): Promise<ReScriptConfig>;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Parse environment variable value to appropriate type
     */
    private parseEnvValue;
    /**
     * Set nested object value using dot notation path
     */
    private setNestedValue;
    /**
     * Validate and normalize CLI options into config override
     */
    validateCliOverride(options: Record<string, unknown>): PartialConfig;
    /**
     * Save configuration to file
     */
    saveConfig(config: ReScriptConfig, filePath?: string): Promise<void>;
    /**
     * Get default configuration
     */
    getDefaultConfig(): ReScriptConfig;
    /**
     * Validate configuration and provide detailed feedback
     */
    validateConfigWithFeedback(config: unknown): {
        valid: boolean;
        config?: ReScriptConfig;
        errors: string[];
        warnings: string[];
    };
}
export declare const configLoader: ConfigLoader;
//# sourceMappingURL=loader.d.ts.map