/**
 * Example local LLM provider plugin using Ollama
 */

import { ProviderPlugin, PluginContext, ProviderCapabilities } from '../types.js';
import { ProcessingResult } from '../../types.js';

export const localLlmProviderPlugin: ProviderPlugin = {
  metadata: {
    name: 'local-llm-provider',
    version: '1.0.0',
    description: 'Local LLM provider using Ollama for privacy-focused code processing',
    author: 're-Script Team',
    category: 'provider',
    tags: ['ollama', 'local', 'privacy', 'llm'],
    dependencies: ['ollama'],
  },

  async init(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Local LLM provider plugin initialized');
    
    // Check if Ollama is available
    const available = await this.isAvailable();
    if (!available) {
      context.utils.log('warn', 'Ollama service is not available');
    }
  },

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  },

  async process(input: string, context: PluginContext): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      context.utils.log('info', 'Processing code with local LLM');

      // Get model from plugin config or use default
      const model = (context as any).config?.model || 'codellama:13b';
      const temperature = (context as any).config?.temperature || 0.1;

      const prompt = this.buildPrompt(input);
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          temperature,
          stream: false,
          options: {
            num_predict: 8192,
            stop: ['<|end|>', '```'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const processedCode = this.extractCode(result.response);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      context.utils.log('info', `Local LLM processing completed in ${processingTime}ms`);

      return {
        success: true,
        output: processedCode,
        processingTime,
        tokensCount: this.estimateTokens(input + processedCode),
        provider: 'local-llm-provider',
        model,
        statistics: {
          inputLength: input.length,
          outputLength: processedCode.length,
          tokensCount: this.estimateTokens(input + processedCode),
          processingTime,
          cacheHit: false,
        },
      };

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      context.utils.log('error', `Local LLM processing failed: ${error}`);

      return {
        success: false,
        output: input, // Return original on failure
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        tokensCount: 0,
        provider: 'local-llm-provider',
        model: 'unknown',
      };
    }
  },

  getCapabilities(): ProviderCapabilities {
    return {
      maxInputLength: 100000, // Depends on model context window
      supportedFormats: ['javascript', 'typescript', 'json'],
      streaming: false, // Could be implemented
      concurrent: true,
      costEstimation: false, // Local models have no cost
    };
  },

  async cleanup(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Local LLM provider plugin cleaned up');
  },

  /**
   * Build prompt for code processing
   */
  private buildPrompt(code: string): string {
    return `You are an expert JavaScript developer. Your task is to improve the readability and maintainability of the following minified or obfuscated JavaScript code.

Please:
1. Deobfuscate variable and function names to be descriptive
2. Add proper formatting and indentation
3. Add helpful comments where appropriate
4. Preserve the original functionality exactly
5. Use modern JavaScript best practices where possible

Original code:
\`\`\`javascript
${code}
\`\`\`

Improved code:
\`\`\`javascript`;
  },

  /**
   * Extract code from LLM response
   */
  private extractCode(response: string): string {
    // Look for code blocks
    const codeBlockMatch = response.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
    
    if (codeBlockMatch) {
      return codeBlockMatch[1]!.trim();
    }

    // If no code block, try to extract code after certain patterns
    const patterns = [
      /improved code:\s*([\s\S]*?)$/i,
      /here's the improved version:\s*([\s\S]*?)$/i,
      /cleaned up code:\s*([\s\S]*?)$/i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1]!.trim();
      }
    }

    // Fallback: return the entire response
    return response.trim();
  },

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for code
    return Math.ceil(text.length / 4);
  },

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
      
    } catch {
      return [];
    }
  },

  /**
   * Check model availability
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const availableModels = await this.getAvailableModels();
    return availableModels.includes(modelName);
  },

  /**
   * Pull a model if not available
   */
  async pullModel(modelName: string, context: PluginContext): Promise<boolean> {
    try {
      context.utils.log('info', `Pulling model: ${modelName}`);

      const response = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      context.utils.log('info', `Model ${modelName} pulled successfully`);
      return true;

    } catch (error) {
      context.utils.log('error', `Failed to pull model ${modelName}: ${error}`);
      return false;
    }
  },
};

export default localLlmProviderPlugin;