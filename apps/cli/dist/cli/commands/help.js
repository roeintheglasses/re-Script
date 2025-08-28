/**
 * Help command with detailed instructions
 */
import chalk from 'chalk';
export function helpCommand() {
    console.log(chalk.bold.blue('📚 re-Script - Advanced JavaScript Unminifier\n'));
    // Overview
    console.log(chalk.bold('🎯 Overview:'));
    console.log(chalk.gray('Transform minified and obfuscated JavaScript into readable code using AI.'));
    console.log(chalk.gray('Supports OpenAI, Anthropic Claude, and local Ollama models.\n'));
    // Quick Start
    console.log(chalk.bold('🚀 Quick Start:'));
    console.log(chalk.cyan('   re-script init'));
    console.log(chalk.gray('   • Interactive setup wizard (recommended for first time)'));
    console.log(chalk.gray('   • Configure your provider, model, and API key'));
    console.log();
    console.log(chalk.cyan('   re-script app.min.js'));
    console.log(chalk.gray('   • Process a single minified file'));
    console.log();
    console.log(chalk.cyan('   re-script src/ --recursive --output dist/'));
    console.log(chalk.gray('   • Process entire directory recursively\n'));
    // Main Commands
    console.log(chalk.bold('📋 Commands:'));
    const commands = [
        {
            command: 'process <input>',
            alias: '(default)',
            description: 'Process JavaScript files',
            examples: [
                're-script app.min.js',
                're-script src/ --recursive',
                're-script *.min.js --output clean/'
            ]
        },
        {
            command: 'init',
            description: 'Interactive setup wizard',
            examples: [
                're-script init'
            ]
        },
        {
            command: 'config <action>',
            description: 'Manage configuration',
            examples: [
                're-script config show',
                're-script config set provider.name anthropic',
                're-script config validate'
            ]
        },
        {
            command: 'examples',
            description: 'Show usage examples',
            examples: [
                're-script examples'
            ]
        },
        {
            command: 'help',
            description: 'Show detailed help (this command)',
            examples: [
                're-script help'
            ]
        }
    ];
    commands.forEach(cmd => {
        console.log(chalk.bold.cyan(`   ${cmd.command}`) + (cmd.alias ? chalk.gray(` ${cmd.alias}`) : ''));
        console.log(chalk.gray(`      ${cmd.description}`));
        if (cmd.examples && cmd.examples.length > 0) {
            cmd.examples.forEach(example => {
                console.log(chalk.dim(`      ${example}`));
            });
        }
        console.log();
    });
    // Key Options
    console.log(chalk.bold('⚙️  Key Options:'));
    const options = [
        {
            option: '-o, --output <path>',
            description: 'Output file or directory path'
        },
        {
            option: '-c, --config <path>',
            description: 'Path to configuration file'
        },
        {
            option: '-p, --provider <name>',
            description: 'LLM provider (openai, anthropic, ollama)'
        },
        {
            option: '-m, --model <name>',
            description: 'Model name to use'
        },
        {
            option: '--api-key <key>',
            description: 'API key for the LLM provider'
        },
        {
            option: '-r, --recursive',
            description: 'Process directories recursively'
        },
        {
            option: '--pattern <glob>',
            description: 'File pattern to match (e.g., "*.min.js")'
        },
        {
            option: '--exclude <patterns...>',
            description: 'Patterns to exclude'
        },
        {
            option: '--dry-run',
            description: 'Preview changes without writing files'
        },
        {
            option: '--concurrency <number>',
            description: 'Number of concurrent requests'
        },
        {
            option: '-v, --verbose',
            description: 'Enable verbose logging'
        },
        {
            option: '-q, --quiet',
            description: 'Suppress non-error output'
        }
    ];
    options.forEach(opt => {
        console.log(chalk.cyan(`   ${opt.option}`));
        console.log(chalk.gray(`      ${opt.description}`));
    });
    console.log();
    // Configuration
    console.log(chalk.bold('📁 Configuration:'));
    console.log(chalk.gray('Configuration files are searched in this order:'));
    console.log(chalk.cyan('   • .rescriptrc.json'));
    console.log(chalk.cyan('   • .rescriptrc.yaml'));
    console.log(chalk.cyan('   • rescript.config.js'));
    console.log(chalk.cyan('   • package.json (in "rescript" field)'));
    console.log();
    console.log(chalk.gray('Environment variables:'));
    console.log(chalk.cyan('   • ANTHROPIC_API_KEY'));
    console.log(chalk.cyan('   • OPENAI_API_KEY'));
    console.log(chalk.cyan('   • OLLAMA_BASE_URL'));
    console.log(chalk.cyan('   • RESCRIPT_DEBUG\n'));
    // Examples by Use Case
    console.log(chalk.bold('💡 Common Use Cases:'));
    const useCases = [
        {
            title: '🔧 Single File Processing',
            examples: [
                're-script bundle.min.js',
                're-script app.min.js --output app.readable.js',
                're-script minified.js --provider anthropic'
            ]
        },
        {
            title: '📁 Batch Processing',
            examples: [
                're-script src/ --recursive --pattern "*.min.js"',
                're-script dist/ -r --exclude "node_modules/**" "*.test.js"',
                're-script files/ --concurrency 5 --output clean/'
            ]
        },
        {
            title: '🤖 Provider-Specific',
            examples: [
                're-script app.min.js --provider openai --model gpt-4',
                're-script app.min.js --provider anthropic --model claude-3-5-sonnet-20241022',
                're-script app.min.js --provider ollama --model codellama:13b'
            ]
        },
        {
            title: '🔍 Testing & Debugging',
            examples: [
                're-script app.min.js --dry-run --verbose',
                're-script src/ --dry-run --pattern "*.js"',
                'RESCRIPT_DEBUG=true re-script app.min.js'
            ]
        }
    ];
    useCases.forEach(useCase => {
        console.log(chalk.bold.yellow(`   ${useCase.title}:`));
        useCase.examples.forEach(example => {
            console.log(chalk.cyan(`      ${example}`));
        });
        console.log();
    });
    // Providers
    console.log(chalk.bold('🤖 Supported Providers:'));
    const providers = [
        {
            name: 'OpenAI',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
            setup: 'Get API key from https://platform.openai.com/api-keys'
        },
        {
            name: 'Anthropic',
            models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
            setup: 'Get API key from https://console.anthropic.com/'
        },
        {
            name: 'Ollama (Local)',
            models: ['llama3:8b', 'llama3:70b', 'codellama:13b', 'codellama:34b', 'mistral:7b'],
            setup: 'Install from https://ollama.ai/ and run "ollama serve"'
        }
    ];
    providers.forEach(provider => {
        console.log(chalk.bold.cyan(`   ${provider.name}:`));
        console.log(chalk.gray(`      Models: ${provider.models.slice(0, 3).join(', ')}${provider.models.length > 3 ? ', ...' : ''}`));
        console.log(chalk.gray(`      Setup: ${provider.setup}`));
        console.log();
    });
    // Processing Pipeline
    console.log(chalk.bold('🔄 Processing Pipeline:'));
    console.log(chalk.cyan('   1. Webcrack Processing'));
    console.log(chalk.gray('      • Reverse bundling and deobfuscation'));
    console.log(chalk.cyan('   2. Babel Transformations'));
    console.log(chalk.gray('      • AST-based code improvements'));
    console.log(chalk.cyan('   3. LLM Processing'));
    console.log(chalk.gray('      • AI-powered variable/function renaming'));
    console.log(chalk.cyan('   4. Code Formatting'));
    console.log(chalk.gray('      • Final prettification with Prettier\n'));
    // Troubleshooting
    console.log(chalk.bold('🛠️  Common Issues:'));
    const troubleshooting = [
        {
            issue: 'API Key Errors',
            solutions: [
                're-script config set provider.apiKey "your-key"',
                'export ANTHROPIC_API_KEY="your-key"'
            ]
        },
        {
            issue: 'Rate Limiting',
            solutions: [
                're-script config set processing.concurrency 1',
                '--concurrency 1 (reduce parallel requests)'
            ]
        },
        {
            issue: 'Large Files',
            solutions: [
                're-script config set processing.chunking.maxChunkSize 2000',
                'Split large files before processing'
            ]
        },
        {
            issue: 'Ollama Not Found',
            solutions: [
                'Install Ollama from https://ollama.ai/',
                'ollama serve (start the server)',
                'ollama pull llama3:8b (install a model)'
            ]
        }
    ];
    troubleshooting.forEach(item => {
        console.log(chalk.bold.red(`   ${item.issue}:`));
        item.solutions.forEach(solution => {
            console.log(chalk.cyan(`      ${solution}`));
        });
        console.log();
    });
    // Footer
    console.log(chalk.bold('📞 Need More Help?'));
    console.log(chalk.cyan('   • Documentation: https://github.com/roeintheglasses/re-Script'));
    console.log(chalk.cyan('   • Issues: https://github.com/roeintheglasses/re-Script/issues'));
    console.log(chalk.cyan('   • Discussions: https://github.com/roeintheglasses/re-Script/discussions'));
    console.log();
    console.log(chalk.gray('💡 Use "re-script examples" for more usage examples'));
    console.log(chalk.gray('💡 Use "re-script config --help" for configuration details'));
}
//# sourceMappingURL=help.js.map