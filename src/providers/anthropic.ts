/**
 * Anthropic Claude provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
import { ReScriptError, ErrorCode, LLMRequestError } from '../utils/errors.js';

export class AnthropicProvider extends BaseLLMProvider {
  public readonly name = 'anthropic';
  public readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022', 
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ];

  private availableModels: string[] = [];
  private modelsLoaded = false;
  public readonly maxTokens = 200000; // Claude 3.5 Sonnet context window
  public readonly supportsStreaming = true;
  public readonly supportsFunctionCalling = true;

  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
    });
  }

  /**
   * Process code using Claude
   */
  async processCode(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.messages.create({
          model: request.model,
          max_tokens: Math.min(request.maxTokens || this.config.maxTokens, 8192),
          temperature: request.temperature || this.config.temperature,
          system: request.systemPrompt || this.createSystemPrompt(),
          messages: [{
            role: 'user',
            content: this.createUserPrompt(request.code)
          }],
          tools: [{
            name: 'suggest_renames',
            description: 'Suggest meaningful names for variables and functions in JavaScript code',
            input_schema: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  description: 'Array of rename suggestions',
                  items: {
                    type: 'object',
                    properties: {
                      originalName: {
                        type: 'string',
                        description: 'Current variable/function name'
                      },
                      suggestedName: {
                        type: 'string', 
                        description: 'Suggested new name'
                      },
                      confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Confidence score for the suggestion'
                      },
                      reasoning: {
                        type: 'string',
                        description: 'Brief explanation for the name choice'
                      },
                      type: {
                        type: 'string',
                        enum: ['variable', 'function', 'class', 'method', 'property'],
                        description: 'Type of identifier being renamed'
                      }
                    },
                    required: ['originalName', 'suggestedName', 'confidence', 'type']
                  }
                }
              },
              required: ['suggestions']
            }
          }],
          tool_choice: { type: 'tool', name: 'suggest_renames' }
        });
      });

      const processingTime = Date.now() - startTime;

      // Extract suggestions from tool use
      const toolUse = response.content.find(
        content => content.type === 'tool_use'
      ) as Anthropic.ToolUseBlock | undefined;

      if (!toolUse || toolUse.name !== 'suggest_renames') {
        throw new Error('Expected tool_use response with suggest_renames');
      }

      const suggestions = this.parseRenameSuggestions(toolUse.input);
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      
      this.totalTokensUsed += tokensUsed;

      return {
        suggestions,
        confidence: this.calculateOverallConfidence(suggestions),
        tokensUsed,
        processingTime,
      };

    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new LLMRequestError(
          this.name,
          `Claude API error: ${error.message}`,
          this.isRetryableAnthropicError(error),
          error
        );
      }

      if (error instanceof ReScriptError) {
        throw error;
      }

      throw new LLMRequestError(
        this.name,
        error instanceof Error ? error.message : String(error),
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create enhanced user prompt for Claude
   */
  protected override createUserPrompt(code: string): string {
    const basePrompt = super.createUserPrompt(code);
    
    return `${basePrompt}

Please use the suggest_renames tool to provide structured rename suggestions. Focus on:

1. **Context Analysis**: Understand what each variable/function does based on its usage
2. **Semantic Naming**: Choose names that clearly express purpose and intent  
3. **Code Patterns**: Recognize common JavaScript patterns and idioms
4. **Scope Awareness**: Consider variable scope when suggesting names
5. **Consistency**: Maintain naming consistency across related variables

For each suggestion, provide:
- **originalName**: The current identifier name
- **suggestedName**: Your recommended replacement (camelCase for variables/functions)
- **confidence**: How confident you are (0.0-1.0)
- **reasoning**: Brief explanation of your choice
- **type**: Whether it's a variable, function, class, method, or property

Prioritize high-confidence suggestions for variables/functions that are clearly identifiable from context.`;
  }

  /**
   * Check if Anthropic error is retryable
   */
  private isRetryableAnthropicError(error: any): boolean {
    // Rate limit errors
    if (error.status === 429) return true;
    
    // Server errors
    if (error.status && error.status >= 500) return true;
    
    // Timeout errors
    if (error.message.toLowerCase().includes('timeout')) return true;
    
    // Connection errors
    if (error.message.toLowerCase().includes('connection')) return true;
    
    return false;
  }

  /**
   * Get model-specific token limits
   */
  getModelTokenLimit(model: string): number {
    const limits: Record<string, number> = {
      'claude-3-5-sonnet-20241022': 200000,
      'claude-3-5-haiku-20241022': 200000,
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
    };
    
    return limits[model] || 200000;
  }

  /**
   * Get recommended model for code size
   */
  getRecommendedModel(codeSize: number): string {
    if (codeSize < 10000) {
      return 'claude-3-5-haiku-20241022'; // Fast and cost-effective
    } else if (codeSize < 50000) {
      return 'claude-3-5-sonnet-20241022'; // Best balance
    } else {
      return 'claude-3-opus-20240229'; // Most capable for complex code
    }
  }

  /**
   * Estimate cost for request
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Approximate pricing as of 2024 (in USD per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-5-haiku-20241022': { input: 0.00025, output: 0.00125 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const modelPricing = pricing[model] || pricing['claude-3-5-sonnet-20241022']!;
    
    return (inputTokens / 1000) * modelPricing.input + 
           (outputTokens / 1000) * modelPricing.output;
  }

  /**
   * Load available models from Anthropic
   * Note: Anthropic doesn't have a public models API, so we use a curated list
   */
  async loadAvailableModels(): Promise<string[]> {
    if (this.modelsLoaded && this.availableModels.length > 0) {
      return this.availableModels;
    }

    try {
      // Anthropic doesn't provide a models list API, so we'll use an updated curated list
      // These are the models known to be available as of the latest update
      const curatedModels = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229', 
        'claude-3-haiku-20240307'
      ];

      // We could potentially test model availability by making a small request
      // but that would require API credits, so we'll stick with the curated list
      this.availableModels = curatedModels;
      this.modelsLoaded = true;
      
      return this.availableModels;
    } catch (error) {
      // Fallback to hardcoded models if anything fails
      console.warn(`⚠️  Could not load Anthropic models: ${error instanceof Error ? error.message : String(error)}`);
      return this.models;
    }
  }

  /**
   * Get available models (public interface)
   */
  async getAvailableModels(): Promise<string[]> {
    return this.loadAvailableModels();
  }
}

// Re-export types
import type { ProviderConfig } from '../types.js';