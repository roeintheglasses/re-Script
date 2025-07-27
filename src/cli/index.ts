#!/usr/bin/env node

/**
 * Main CLI entry point for re-Script v2
 */

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { processCommand } from './commands/process.js';
import { configCommand } from './commands/config.js';
import { validateCommand } from './commands/validate.js';
import { ReScriptError, formatErrorMessage } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from package.json
function getVersion(): string {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version as string;
  } catch {
    return '2.0.0';
  }
}

function displayHeader(): void {
  const version = getVersion();
  console.log(chalk.hex('#0d0d0d').bgWhite.bold(' re-Script v2 '));
  console.log(chalk.gray(`Advanced JavaScript unminifier powered by AI • v${version}`));
  console.log();
}

function setupGlobalErrorHandling(): void {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red.bold('❌ Uncaught Exception:'));
    console.error(chalk.red(error.stack || error.message));
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(chalk.red.bold('❌ Unhandled Promise Rejection:'));
    console.error(chalk.red(String(reason)));
    process.exit(1);
  });
}

function handleError(error: unknown): void {
  if (error instanceof ReScriptError) {
    console.error(formatErrorMessage(error.toProcessingError()));
    process.exit(error.recoverable ? 2 : 1);
  }

  if (error instanceof Error) {
    console.error(chalk.red.bold('❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (program.opts().verbose) {
      console.error(chalk.gray(error.stack));
    }
  } else {
    console.error(chalk.red.bold('❌ Unknown error:'));
    console.error(chalk.red(String(error)));
  }

  process.exit(1);
}

async function main(): Promise<void> {
  setupGlobalErrorHandling();

  const version = getVersion();

  program
    .name('re-script')
    .description('Advanced JavaScript unminifier powered by AI')
    .version(version)
    .option('-v, --verbose', 'enable verbose logging')
    .option('-q, --quiet', 'suppress non-error output')
    .option('--no-color', 'disable colored output')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      
      // Set up chalk color support
      if (opts.noColor) {
        chalk.level = 0;
      }

      // Show header for main commands (not for help/version)
      if (!opts.quiet && thisCommand.args.length > 0) {
        displayHeader();
      }
    });

  // Main process command (default)
  program
    .command('process', { isDefault: true })
    .description('Process and unminify JavaScript files')
    .argument('<input>', 'input file or directory path')
    .option('-o, --output <path>', 'output file or directory path')
    .option('-c, --config <path>', 'path to configuration file')
    .option('-p, --provider <name>', 'LLM provider (openai, anthropic, ollama)')
    .option('-m, --model <name>', 'model name to use')
    .option('--api-key <key>', 'API key for the LLM provider')
    .option('-t, --temperature <number>', 'temperature for LLM requests', parseFloat)
    .option('--max-tokens <number>', 'maximum tokens for LLM requests', parseInt)
    .option('--concurrency <number>', 'number of concurrent requests', parseInt)
    .option('-r, --recursive', 'process directories recursively')
    .option('--pattern <glob>', 'file pattern to match (e.g., "*.min.js")')
    .option('--exclude <patterns...>', 'patterns to exclude')
    .option('--dry-run', 'preview changes without writing files')
    .option('-w, --watch', 'watch for file changes and reprocess')
    .option('-f, --force', 'overwrite existing output files')
    .action(async (input, options) => {
      try {
        await processCommand(input, options);
      } catch (error) {
        handleError(error);
      }
    });

  // Configuration management
  program
    .command('config')
    .description('Manage configuration')
    .addCommand(configCommand);

  // Validation utilities
  program
    .command('validate')
    .description('Validate files and configuration')
    .addCommand(validateCommand);

  // Example usage command
  program
    .command('examples')
    .description('Show usage examples')
    .action(() => {
      console.log(chalk.bold('📚 re-Script Usage Examples:\n'));
      
      console.log(chalk.cyan('Basic usage:'));
      console.log('  re-script app.min.js');
      console.log('  re-script src/ -o dist/ --recursive\n');
      
      console.log(chalk.cyan('With specific provider:'));
      console.log('  re-script app.min.js --provider anthropic --model claude-3-5-sonnet-20241022');
      console.log('  re-script app.min.js --provider openai --model gpt-4\n');
      
      console.log(chalk.cyan('Configuration file:'));
      console.log('  re-script config init');
      console.log('  re-script app.min.js --config custom.config.js\n');
      
      console.log(chalk.cyan('Advanced options:'));
      console.log('  re-script src/ --recursive --pattern "*.min.js" --exclude "node_modules/**"');
      console.log('  re-script app.min.js --dry-run --verbose');
      console.log('  re-script src/ --watch --concurrency 10\n');
      
      console.log(chalk.cyan('Local models:'));
      console.log('  re-script app.min.js --provider ollama --model llama3:8b');
      console.log('  OLLAMA_BASE_URL=http://localhost:11434 re-script app.min.js\n');
    });

  // Help command enhancement
  program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + (cmd.aliases().length > 0 ? `|${cmd.aliases().join('|')}` : ''),
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    handleError(error);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(handleError);
}

export { main };