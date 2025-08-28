/**
 * Ollama provider implementation for local models
 */

import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
import { ReScriptError, ErrorCode, LLMRequestError } from '../utils/errors.js';

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends BaseLLMProvider {
  public readonly name = 'ollama';
  public readonly models: string[] = []; // Will be populated dynamically
  public readonly maxTokens = 32768; // Default context window
  public readonly supportsStreaming = true;
  public readonly supportsFunctionCalling = false; // Most local models don't support this yet

  private baseUrl: string;
  private availableModels: OllamaModelInfo[] = [];
  private modelsLoaded = false;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  /**
   * Check if API key is required (Ollama typically doesn't need one)
   */
  protected override requiresApiKey(): boolean {
    return false;
  }

  /**
   * Process code using Ollama
   */
  async processCode(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Ensure we have the model available
      await this.ensureModelAvailable(request.model);

      // Create the prompt since Ollama doesn't support function calling
      const prompt = this.createCompletePrompt(request.code);

      const response = await this.executeWithRetry(async () => {
        return await this.generateCompletion(request.model, prompt, {
          temperature: request.temperature || this.config.temperature,
          num_predict: Math.min(request.maxTokens || this.config.maxTokens, 4096),
        });
      });

      const processingTime = Date.now() - startTime;

      // Parse suggestions from text response
      const suggestions = this.parseTextResponse(response.response);
      
      // Calculate token usage (estimate)
      const tokensUsed = (response.prompt_eval_count || 0) + (response.eval_count || 0);
      
      this.totalTokensUsed += tokensUsed;

      return {
        suggestions,
        confidence: this.calculateOverallConfidence(suggestions),
        tokensUsed,
        processingTime,
      };

    } catch (error) {
      if (error instanceof ReScriptError) {
        throw error;
      }

      throw new LLMRequestError(
        this.name,
        error instanceof Error ? error.message : String(error),
        this.isNonRetryableError(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create complete prompt for text-based models
   */
  private createCompletePrompt(code: string): string {
    const systemPrompt = this.createSystemPrompt();
    const userPrompt = this.createUserPrompt(code);
    
    return `${systemPrompt}

${userPrompt}

Please respond with a JSON object containing an array of rename suggestions. Each suggestion should have:
- originalName: the current variable/function name
- suggestedName: your recommended new name
- confidence: a number between 0 and 1
- reasoning: brief explanation
- type: one of 'variable', 'function', 'class', 'method', 'property'

Example format:
{
  "suggestions": [
    {
      "originalName": "a",
      "suggestedName": "userAge", 
      "confidence": 0.9,
      "reasoning": "Variable stores user's age based on usage context",
      "type": "variable"
    }
  ]
}

JSON Response:`;
  }

  /**
   * Generate completion using Ollama API
   */
  private async generateCompletion(
    model: string,
    prompt: string,
    options: {
      temperature: number;
      num_predict: number;
    }
  ): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.num_predict,
          top_k: 40,
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<OllamaResponse>;
  }

  /**
   * Parse text response to extract rename suggestions
   */
  private parseTextResponse(text: string): RenameSuggestion[] {
    try {
      // Find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in Ollama response, attempting fallback parsing');
        return this.parseTextFallback(text);
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      return this.parseRenameSuggestions(parsed);

    } catch (error) {
      console.warn(`Failed to parse Ollama JSON response: ${error}`);
      return this.parseTextFallback(text);
    }
  }

  /**
   * Fallback text parsing when JSON parsing fails
   */
  private parseTextFallback(text: string): RenameSuggestion[] {
    const suggestions: RenameSuggestion[] = [];
    
    // Look for patterns like "rename a to userAge" or "a -> userAge"
    const patterns = [
      /rename\s+(\w+)\s+to\s+(\w+)/gi,
      /(\w+)\s*->\s*(\w+)/g,
      /(\w+)\s*=>\s*(\w+)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        suggestions.push({
          originalName: match[1]!,
          suggestedName: match[2]!,
          confidence: 0.5, // Lower confidence for fallback parsing
          reasoning: 'Extracted from text response',
          type: 'variable',
        });
      }
    }

    return suggestions.slice(0, 20); // Limit to prevent spam
  }

  /**
   * Ensure model is available locally
   */
  private async ensureModelAvailable(modelName: string): Promise<void> {
    if (!this.modelsLoaded) {
      await this.loadAvailableModels();
    }

    const isAvailable = this.availableModels.some(model => 
      model.name === modelName || model.name.startsWith(modelName.split(':')[0]!)
    );

    if (!isAvailable) {
      throw new ReScriptError(
        ErrorCode.INVALID_MODEL,
        `Model '${modelName}' not found locally. Available models: ${this.availableModels.map(m => m.name).join(', ')}`,
        'ollama-model-check',
        false,
        [
          `Pull the model: ollama pull ${modelName}`,
          'Check available models: ollama list',
          'Visit https://ollama.ai/library for model catalog'
        ]
      );
    }
  }

  /**
   * Load available models from Ollama
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json() as { models: OllamaModelInfo[] };
      this.availableModels = data.models || [];
      
      // Update the models array
      (this as any).models = this.availableModels.map(model => model.name);
      this.modelsLoaded = true;

      console.log(`📦 Found ${this.availableModels.length} Ollama models`);

    } catch (error) {
      throw new ReScriptError(
        ErrorCode.LLM_REQUEST_FAILED,
        `Failed to connect to Ollama at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`,
        'ollama-connection',
        false,
        [
          'Ensure Ollama is running: ollama serve',
          'Check the base URL is correct',
          'Install Ollama from https://ollama.ai'
        ]
      );
    }
  }

  /**
   * Check Ollama server health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    version?: string;
    models: number;
    error?: string;
  }> {
    try {
      // Check if server is responding
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        return {
          healthy: false,
          models: 0,
          error: `Server returned ${response.status}`,
        };
      }

      const versionData = await response.json() as { version: string };
      
      // Load models to get count
      await this.loadAvailableModels();

      return {
        healthy: true,
        version: versionData.version,
        models: this.availableModels.length,
      };

    } catch (error) {
      return {
        healthy: false,
        models: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get recommended models for different use cases
   */
  getRecommendedModels(): {
    speed: string[];
    quality: string[];
    coding: string[];
  } {
    return {
      speed: [
        'llama3.2:1b',
        'llama3.2:3b', 
        'phi3:mini',
        'qwen2:0.5b'
      ],
      quality: [
        'llama3.1:8b',
        'llama3.1:70b',
        'mistral:7b',
        'qwen2:7b'
      ],
      coding: [
        'codellama:7b',
        'codellama:13b',
        'codellama:34b',
        'deepseek-coder:6.7b',
        'starcoder2:3b'
      ],
    };
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.total && data.completed && onProgress) {
              const progress = (data.completed / data.total) * 100;
              onProgress(progress);
            }
          } catch {
            // Ignore JSON parsing errors for progress lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Refresh available models
    this.modelsLoaded = false;
    await this.loadAvailableModels();
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModelInfo | null> {
    if (!this.modelsLoaded) {
      await this.loadAvailableModels();
    }

    return this.availableModels.find(model => 
      model.name === modelName || model.name.startsWith(modelName.split(':')[0]!)
    ) || null;
  }

  /**
   * Estimate cost (Ollama is free, so return 0)
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    return 0; // Ollama is free to use locally
  }

  /**
   * Get model token limit
   */
  getModelTokenLimit(model: string): number {
    // Common context windows for popular models
    const limits: Record<string, number> = {
      'llama3.1:8b': 128000,
      'llama3.1:70b': 128000,
      'llama3.2:1b': 32768,
      'llama3.2:3b': 32768,
      'codellama:7b': 16384,
      'codellama:13b': 16384,
      'codellama:34b': 16384,
      'mistral:7b': 32768,
      'qwen2:7b': 32768,
      'deepseek-coder:6.7b': 16384,
    };

    // Try exact match first, then prefix match
    if (limits[model]) {
      return limits[model]!;
    }

    const prefix = model.split(':')[0]!;
    for (const [key, limit] of Object.entries(limits)) {
      if (key.startsWith(prefix)) {
        return limit;
      }
    }

    return 4096; // Conservative default
  }

  /**
   * Get recommended model for code size
   */
  getRecommendedModel(codeSize: number): string {
    if (codeSize < 5000) {
      return 'codellama:7b'; // Fast for small files
    } else if (codeSize < 20000) {
      return 'codellama:13b'; // Good balance
    } else {
      return 'llama3.1:8b'; // Better for complex code
    }
  }

  /**
   * Get available models (public interface)
   */
  async getAvailableModels(): Promise<string[]> {
    await this.loadAvailableModels();
    return this.availableModels.map(model => model.name);
  }
}

// Re-export types
import type { ProviderConfig, RenameSuggestion } from '../types.js';