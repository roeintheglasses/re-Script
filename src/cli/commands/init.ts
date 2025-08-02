/**
 * Interactive initialization command
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { configLoader } from '../../config/loader.js';
import { OpenAIProvider } from '../../providers/openai.js';
import { AnthropicProvider } from '../../providers/anthropic.js';
import { OllamaProvider } from '../../providers/ollama.js';

interface ProviderOption {
  name: string;
  displayName: string;
  fallbackModels: string[]; // Fallback models if API fetch fails
  requiresApiKey: boolean;
  description: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    name: 'openai',
    displayName: 'OpenAI',
    fallbackModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    requiresApiKey: true,
    description: 'Most popular AI provider, excellent for code analysis'
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic',
    fallbackModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
    requiresApiKey: true,
    description: 'Advanced reasoning capabilities, great for complex code'
  },
  {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    fallbackModels: ['llama2', 'codellama', 'mistral', 'neural-chat'],
    requiresApiKey: false,
    description: 'Run models locally, no API key needed, completely private'
  }
];

async function fetchModelsForProvider(providerName: string, apiKey?: string): Promise<string[]> {
  try {
    const provider = PROVIDERS.find(p => p.name === providerName);
    if (!provider) {
      return [];
    }

    let models: string[] = [];

  switch (providerName) {
      case 'openai':
        if (apiKey?.trim()) {
          try {
            console.log(chalk.gray(`   Fetching OpenAI models...`));
            const openaiProvider = new OpenAIProvider({
              name: 'openai',
              model: 'gpt-4o',
              apiKey: apiKey.trim(),
              temperature: 0.3,
              maxTokens: 4000,
              timeout: 30000
            } as any);
            models = await openaiProvider.getAvailableModels();
          } catch (error) {
            console.log(chalk.yellow(`   ⚠️  Failed to load OpenAI models: ${error instanceof Error ? error.message : String(error)}`));
            models = provider.fallbackModels;
          }
        } else {
          console.log(chalk.gray(`   Using curated OpenAI models`));
          models = provider.fallbackModels;
        }
        break;

      case 'anthropic':
        if (apiKey?.trim()) {
          try {
            console.log(chalk.gray(`   Loading Anthropic models...`));
            const anthropicProvider = new AnthropicProvider({
              name: 'anthropic',
              model: 'claude-3-5-sonnet-20241022',
              apiKey: apiKey.trim(),
              temperature: 0.3,
              maxTokens: 8192,
              timeout: 30000
            } as any);
            models = await anthropicProvider.getAvailableModels();
          } catch (error) {
            console.log(chalk.yellow(`   ⚠️  Failed to load Anthropic models: ${error instanceof Error ? error.message : String(error)}`));
            models = provider.fallbackModels;
          }
        } else {
          console.log(chalk.gray(`   Using fallback Anthropic models`));
          models = provider.fallbackModels;
        }
        break;

      case 'ollama':
        try {
          console.log(chalk.gray(`   Checking Ollama installation...`));
          const ollamaProvider = new OllamaProvider({
            name: 'ollama',
            model: 'llama2',
            baseUrl: 'http://localhost:11434',
            temperature: 0.3,
            maxTokens: 4000,
            timeout: 30000
          } as any);
          models = await ollamaProvider.getAvailableModels();
          
          if (models.length === 0) {
            console.log(chalk.yellow(`   No Ollama models found. Use 'ollama pull <model>' to install models.`));
            models = provider.fallbackModels;
          } else {
            console.log(chalk.green(`   Found ${models.length} installed Ollama models`));
          }
        } catch (error) {
          console.log(chalk.yellow(`   Ollama not running. Using recommended models.`));
          models = provider.fallbackModels;
        }
        break;

      default:
        models = provider.fallbackModels;
    }

    return models.length > 0 ? models : provider.fallbackModels;
  } catch (error) {
    console.log(chalk.yellow(`   Could not fetch models: ${error instanceof Error ? error.message : String(error)}`));
    const provider = PROVIDERS.find(p => p.name === providerName);
    return provider?.fallbackModels || [];
  }
}

export async function initCommand(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Show welcome message
    console.log(chalk.bold.blue('\n🚀 Welcome to re-Script Setup!\n'));
    console.log(chalk.gray('Let\'s configure your JavaScript unminifier...\n'));

    // Step 1: Select Provider
    console.log(chalk.bold('1. Choose your AI provider:'));
    PROVIDERS.forEach((provider, index) => {
      const badge = provider.requiresApiKey ? chalk.yellow('[API Key Required]') : chalk.green('[Free/Local]');
      console.log(`   ${chalk.cyan((index + 1).toString())}. ${chalk.bold(provider.displayName)} ${badge}`);
      console.log(`      ${chalk.gray(provider.description)}`);
    });

    const providerChoice = await askQuestion(rl, '\nSelect provider (1-3): ');
    const providerIndex = parseInt(providerChoice) - 1;
    
    if (providerIndex < 0 || providerIndex >= PROVIDERS.length) {
      throw new Error('Invalid provider selection');
    }

    const selectedProvider = PROVIDERS[providerIndex]!;
    console.log(chalk.green(`\n✓ Selected: ${selectedProvider.displayName}\n`));

    // Step 2: API Key (if required) - Get this first so we can fetch models
    let apiKey = '';
    if (selectedProvider.requiresApiKey) {
      console.log(chalk.bold('2. Enter your API key (optional - will use fallback models if not provided):'));
      console.log(chalk.gray(`   Get your ${selectedProvider.displayName} API key from:`));
      
      if (selectedProvider.name === 'openai') {
        console.log(chalk.gray('   https://platform.openai.com/api-keys'));
      } else if (selectedProvider.name === 'anthropic') {
        console.log(chalk.gray('   https://console.anthropic.com/'));
      }

      apiKey = await askQuestion(rl, '\nAPI Key (press Enter to skip): ');
      
      if (!apiKey.trim()) {
        console.log(chalk.yellow('\n⚠️  No API key provided. Using fallback models.'));
        console.log(chalk.gray('   You can add your API key later with:'));
        console.log(chalk.cyan(`   node dist/cli/index.js config set provider.apiKey "your-key"`));
      } else {
        console.log(chalk.green('\n✓ API key provided\n'));
      }
    }

    // Step 3: Fetch and Select Model
    console.log(chalk.bold('3. Choose your model:'));
    
    const availableModels = await fetchModelsForProvider(selectedProvider.name, apiKey);
    
    if (availableModels.length === 0) {
      throw new Error('No models available for selected provider');
    }

    availableModels.forEach((model, index) => {
      console.log(`   ${chalk.cyan((index + 1).toString())}. ${chalk.bold(model)}`);
    });

    const modelChoice = await askQuestion(rl, '\nSelect model (1-' + availableModels.length + '): ');
    const modelIndex = parseInt(modelChoice) - 1;
    
    if (modelIndex < 0 || modelIndex >= availableModels.length) {
      throw new Error('Invalid model selection');
    }

    const selectedModel = availableModels[modelIndex]!;
    console.log(chalk.green(`\n✓ Selected: ${selectedModel}\n`));

    // Step 4: Additional setup for Ollama
    if (selectedProvider.name === 'ollama') {
      console.log(chalk.bold('4. Ollama Setup Verification:'));
      console.log(chalk.gray('   Make sure Ollama is installed and running:'));
      console.log(chalk.gray('   • Install: https://ollama.ai/'));
      console.log(chalk.gray('   • Pull model: ollama pull ' + selectedModel));
      console.log(chalk.gray('   • Start server: ollama serve'));
      
      const ollamaReady = await askQuestion(rl, '\nIs Ollama running with this model? (y/n): ');
      if (ollamaReady.toLowerCase() !== 'y') {
        console.log(chalk.yellow('\n⚠️  Please set up Ollama and pull the model before continuing.'));
        console.log(chalk.cyan(`   ollama pull ${selectedModel}`));
      }
    }

    // Step 5: Additional Settings  
    console.log(chalk.bold('5. Additional settings:'));
    
    const temperature = await askQuestion(rl, 'Temperature (0.0-1.0, default 0.3): ') || '0.3';
    const concurrent = await askQuestion(rl, 'Concurrent requests (1-10, default 3): ') || '3';

    // Step 6: Create Configuration
    console.log(chalk.bold('\n6. Creating configuration...\n'));

    const config = {
      provider: {
        name: selectedProvider.name,
        model: selectedModel,
        apiKey: apiKey || '',
        temperature: parseFloat(temperature),
        maxTokens: selectedProvider.name === 'anthropic' ? 8192 : 4000,
        timeout: 30000
      },
      processing: {
        chunking: {
          strategy: 'ast-aware',
          maxChunkSize: 4000,
          overlapPercentage: 0.1,
          respectFunctionBoundaries: true
        },
        caching: {
          enabled: true,
          ttl: 86400,
          backend: 'memory',
          maxSize: 100
        },
        retries: {
          maxAttempts: 3,
          backoffFactor: 2,
          maxDelay: 30000
        },
        concurrency: parseInt(concurrent),
        preserveComments: false,
        preserveSourceMaps: true
      },
      output: {
        format: 'prettier',
        prettierOptions: {
          parser: 'babel',
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          trailingComma: 'es5'
        },
        generateSourceMaps: true,
        addComments: true,
        commentStyle: 'block'
      },
      advanced: {
        enablePlugins: false,
        pluginPaths: [],
        pluginConfig: {
          discovery: {
            paths: ['./plugins', './node_modules/@rescript/plugins'],
            patterns: ['*.plugin.js', '*.plugin.mjs', '*-plugin.js']
          },
          security: {
            allowedApis: ['fs', 'path', 'crypto'],
            allowedPaths: ['./plugins', './temp'],
            timeoutMs: 30000,
            memoryLimitMB: 100,
            networkAccess: false
          },
          execution: {
            hooks: {},
            chains: { transformers: [], analyzers: [] },
            configs: {}
          }
        },
        experimentalFeatures: [],
        debugMode: false,
        logLevel: 'info'
      }
    };

    // Save configuration
    await configLoader.saveConfig(config as any, '.rescriptrc.json');

    // Success message
    console.log(chalk.green.bold('✅ Configuration created successfully!\n'));
    
    console.log(chalk.bold('📁 Configuration saved to:'));
    console.log(chalk.cyan('   .rescriptrc.json\n'));

    console.log(chalk.bold('🚀 Next steps:'));
    console.log(chalk.gray('   1. Create a test minified file:'));
    console.log(chalk.cyan('      echo "function a(b,c){return b+c}console.log(a(1,2))" > test.min.js'));
    console.log(chalk.gray('   2. Process it:'));
    console.log(chalk.cyan('      node dist/cli/index.js test.min.js -o test.readable.js'));
    console.log(chalk.gray('   3. Check the results:'));
    console.log(chalk.cyan('      cat test.readable.js\n'));

    if (!apiKey && selectedProvider.requiresApiKey) {
      console.log(chalk.yellow('⚠️  Don\'t forget to add your API key:'));
      console.log(chalk.cyan(`   node dist/cli/index.js config set provider.apiKey "your-key"\n`));
    }

    console.log(chalk.bold('📚 For more options:'));
    console.log(chalk.cyan('   node dist/cli/index.js --help'));
    console.log(chalk.cyan('   node dist/cli/index.js examples\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  } finally {
    rl.close();
  }
}

function askQuestion(rl: any, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer.trim());
    });
  });
}