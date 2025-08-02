/**
 * Configuration management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, access } from 'fs/promises';
import { resolve } from 'path';
import { configLoader } from '../../config/loader.js';

export const configCommand = new Command('config')
  .description('Manage re-Script configuration');

// Note: init command is now a top-level command (see init.ts)

// Show current configuration
configCommand
  .command('show')
  .description('Display current configuration')
  .option('-c, --config <path>', 'configuration file path')
  .option('--env', 'include environment variables')
  .action(async (options) => {
    try {
      const config = await configLoader.loadConfig(options.config);
      
      console.log(chalk.bold('📋 Current Configuration:\n'));
      
      // Provider settings
      console.log(chalk.bold('🤖 Provider:'));
      console.log(`   Name: ${chalk.cyan(config.provider.name)}`);
      console.log(`   Model: ${chalk.cyan(config.provider.model)}`);
      console.log(`   API Key: ${config.provider.apiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
      console.log(`   Temperature: ${chalk.cyan(config.provider.temperature)}`);
      console.log(`   Max Tokens: ${chalk.cyan(config.provider.maxTokens)}`);
      
      // Processing settings
      console.log(chalk.bold('\n⚙️  Processing:'));
      console.log(`   Chunking Strategy: ${chalk.cyan(config.processing.chunking.strategy)}`);
      console.log(`   Max Chunk Size: ${chalk.cyan(config.processing.chunking.maxChunkSize)}`);
      console.log(`   Concurrency: ${chalk.cyan(config.processing.concurrency)}`);
      console.log(`   Caching: ${config.processing.caching.enabled ? chalk.green('enabled') : chalk.red('disabled')}`);
      
      // Output settings
      console.log(chalk.bold('\n📤 Output:'));
      console.log(`   Format: ${chalk.cyan(config.output.format)}`);
      console.log(`   Source Maps: ${config.output.generateSourceMaps ? chalk.green('enabled') : chalk.red('disabled')}`);
      console.log(`   Add Comments: ${config.output.addComments ? chalk.green('enabled') : chalk.red('disabled')}`);
      
      // Environment variables (if requested)
      if (options.env) {
        console.log(chalk.bold('\n🌍 Environment Variables:'));
        const envVars = [
          'RESCRIPT_PROVIDER',
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'OLLAMA_BASE_URL',
          'RESCRIPT_DEBUG',
        ];
        
        envVars.forEach(envVar => {
          const value = process.env[envVar];
          if (value) {
            console.log(`   ${envVar}: ${chalk.green('✓ Set')}`);
          }
        });
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Validate configuration
configCommand
  .command('validate')
  .description('Validate configuration file')
  .option('-c, --config <path>', 'configuration file path')
  .action(async (options) => {
    try {
      let configData: unknown;
      
      if (options.config) {
        const configPath = resolve(options.config);
        const configContent = await readFile(configPath, 'utf8');
        configData = JSON.parse(configContent);
      } else {
        configData = await configLoader.loadConfig();
      }
      
      const result = configLoader.validateConfigWithFeedback(configData);
      
      if (result.valid) {
        console.log(chalk.green('✅ Configuration is valid!'));
        
        if (result.warnings.length > 0) {
          console.log(chalk.bold('\n⚠️  Warnings:'));
          result.warnings.forEach(warning => {
            console.log(`   ${chalk.yellow('•')} ${warning}`);
          });
        }
      } else {
        console.log(chalk.red('❌ Configuration is invalid!'));
        console.log(chalk.bold('\n🐛 Errors:'));
        result.errors.forEach(error => {
          console.log(`   ${chalk.red('•')} ${error}`);
        });
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to validate configuration: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Set configuration values
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .option('-c, --config <path>', 'configuration file path', '.rescriptrc.json')
  .action(async (key, value, options) => {
    try {
      const configPath = resolve(options.config);
      
      // Load existing config or create new one
      let config;
      try {
        config = await configLoader.loadConfig(configPath);
      } catch {
        config = configLoader.getDefaultConfig();
      }
      
      // Parse value
      let parsedValue: unknown = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);
      
      // Set nested value
      setNestedValue(config, key, parsedValue);
      
      // Validate the updated config
      const validation = configLoader.validateConfigWithFeedback(config);
      if (!validation.valid) {
        console.error(chalk.red('❌ Invalid configuration after update:'));
        validation.errors.forEach(error => {
          console.error(`   ${chalk.red('•')} ${error}`);
        });
        process.exit(1);
      }
      
      // Save the config
      await configLoader.saveConfig(validation.config!, configPath);
      
      console.log(chalk.green(`✅ Configuration updated: ${key} = ${value}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to set configuration: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// Get configuration values
configCommand
  .command('get <key>')
  .description('Get a configuration value')
  .option('-c, --config <path>', 'configuration file path')
  .action(async (key, options) => {
    try {
      const config = await configLoader.loadConfig(options.config);
      const value = getNestedValue(config, key);
      
      if (value === undefined) {
        console.log(chalk.yellow(`⚠️  Configuration key not found: ${key}`));
        process.exit(1);
      }
      
      console.log(chalk.cyan(JSON.stringify(value, null, 2)));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get configuration: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

// List available configuration keys
configCommand
  .command('list')
  .description('List all configuration keys')
  .action(() => {
    console.log(chalk.bold('📋 Available Configuration Keys:\n'));
    
    const sections = [
      {
        title: '🤖 Provider Settings',
        keys: [
          'provider.name',
          'provider.model',
          'provider.apiKey',
          'provider.baseUrl',
          'provider.temperature',
          'provider.maxTokens',
          'provider.timeout',
        ],
      },
      {
        title: '⚙️  Processing Settings',
        keys: [
          'processing.chunking.strategy',
          'processing.chunking.maxChunkSize',
          'processing.chunking.overlapPercentage',
          'processing.caching.enabled',
          'processing.caching.ttl',
          'processing.caching.backend',
          'processing.concurrency',
        ],
      },
      {
        title: '📤 Output Settings',
        keys: [
          'output.format',
          'output.generateSourceMaps',
          'output.addComments',
          'output.prettierOptions.printWidth',
          'output.prettierOptions.tabWidth',
          'output.prettierOptions.singleQuote',
        ],
      },
      {
        title: '🔧 Advanced Settings',
        keys: [
          'advanced.debugMode',
          'advanced.logLevel',
          'advanced.enablePlugins',
        ],
      },
    ];
    
    sections.forEach(section => {
      console.log(chalk.bold(section.title));
      section.keys.forEach(key => {
        console.log(`   ${chalk.cyan(key)}`);
      });
      console.log();
    });
    
    console.log(chalk.gray('💡 Use "re-script config get <key>" to see current values'));
    console.log(chalk.gray('💡 Use "re-script config set <key> <value>" to update values'));
  });

// Utility functions
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}