/**
 * OpenAI GPT provider implementation
 */

import OpenAI from 'openai';
import { BaseLLMProvider } from './base.js';
import { LLMRequest, LLMResponse } from '../types.js';
import { ReScriptError, ErrorCode, LLMRequestError } from '../utils/errors.js';

export class OpenAIProvider extends BaseLLMProvider {
  public readonly name = 'openai';
  public readonly models = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ];
  public readonly maxTokens = 128000; // GPT-4 Turbo context window
  public readonly supportsStreaming = true;
  public readonly supportsFunctionCalling = true;

  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 30000,
      baseURL: config.baseUrl, // Support for Azure OpenAI
    });
  }

  /**
   * Process code using OpenAI GPT
   */
  async processCode(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: request.model,
          max_tokens: Math.min(request.maxTokens || this.config.maxTokens, 4096),
          temperature: request.temperature || this.config.temperature,
          messages: [
            {
              role: 'system',
              content: request.systemPrompt || this.createSystemPrompt()
            },
            {
              role: 'user', 
              content: this.createUserPrompt(request.code)
            }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'suggest_renames',
              description: 'Suggest meaningful names for variables and functions in JavaScript code',
              parameters: {
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
            }
          }],
          tool_choice: { type: 'function', function: { name: 'suggest_renames' } }
        });
      });

      const processingTime = Date.now() - startTime;

      // Extract suggestions from function call
      const message = response.choices[0]?.message;
      if (!message?.tool_calls?.[0]) {
        throw new Error('Expected function call response with suggest_renames');
      }

      const functionCall = message.tool_calls[0];
      if (functionCall.function.name !== 'suggest_renames') {
        throw new Error(`Expected suggest_renames function, got ${functionCall.function.name}`);
      }

      let functionArgs;
      try {
        functionArgs = JSON.parse(functionCall.function.arguments);
      } catch (error) {
        throw new Error(`Invalid function arguments JSON: ${error instanceof Error ? error.message : String(error)}`);
      }

      const suggestions = this.parseRenameSuggestions(functionArgs);
      const tokensUsed = response.usage?.total_tokens || 0;
      
      this.totalTokensUsed += tokensUsed;

      return {
        suggestions,
        confidence: this.calculateOverallConfidence(suggestions),
        tokensUsed,
        processingTime,
      };

    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new LLMRequestError(
          this.name,
          `OpenAI API error: ${error.message}`,
          this.isRetryableOpenAIError(error),
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
   * Create enhanced user prompt for GPT
   */
  protected createUserPrompt(code: string): string {
    const basePrompt = super.createUserPrompt(code);
    
    return `${basePrompt}

Please analyze this code and use the suggest_renames function to provide structured rename suggestions. Focus on:

1. **Pattern Recognition**: Identify common JavaScript patterns and idioms
2. **Context Clues**: Use variable usage patterns to infer purpose
3. **Semantic Meaning**: Choose names that clearly express intent and functionality
4. **Naming Conventions**: Follow JavaScript conventions (camelCase, descriptive names)
5. **Code Flow**: Consider how variables relate to each other in the program flow

For each suggestion, provide:
- **originalName**: The current identifier
- **suggestedName**: Your recommended replacement (use camelCase)
- **confidence**: Your confidence level (0.0 = uncertain, 1.0 = very confident)
- **reasoning**: Brief explanation of why this name is appropriate
- **type**: The type of identifier (variable, function, class, method, property)

Prioritize suggestions where you have high confidence based on clear context clues.`;
  }

  /**
   * Check if OpenAI error is retryable
   */
  private isRetryableOpenAIError(error: OpenAI.APIError): boolean {
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
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385,
    };
    
    return limits[model] || 8192;
  }

  /**
   * Get recommended model for code size
   */
  getRecommendedModel(codeSize: number): string {
    if (codeSize < 5000) {
      return 'gpt-4o-mini'; // Cost-effective for small files
    } else if (codeSize < 20000) {
      return 'gpt-4o'; // Good balance of capability and cost
    } else if (codeSize < 50000) {
      return 'gpt-4-turbo'; // Better for larger contexts
    } else {
      return 'gpt-4o'; // Best for very large files
    }
  }

  /**
   * Estimate cost for request
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Approximate pricing as of 2024 (in USD per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o']!;
    
    return (inputTokens / 1000) * modelPricing.input + 
           (outputTokens / 1000) * modelPricing.output;
  }

  /**
   * Support for Azure OpenAI
   */
  static createAzureProvider(config: ProviderConfig & {
    azureEndpoint: string;
    azureDeployment: string;
    apiVersion?: string;
  }): OpenAIProvider {
    const azureConfig = {
      ...config,
      baseUrl: `${config.azureEndpoint}/openai/deployments/${config.azureDeployment}`,
    };

    const provider = new OpenAIProvider(azureConfig);
    
    // Override client for Azure-specific configuration
    (provider as any).client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: azureConfig.baseUrl,
      defaultQuery: { 'api-version': config.apiVersion || '2024-02-15-preview' },
      defaultHeaders: {
        'api-key': config.apiKey,
      },
    });

    return provider;
  }
}

// Re-export types
import type { ProviderConfig } from '../types.js';