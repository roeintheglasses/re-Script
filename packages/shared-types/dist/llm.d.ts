/**
 * LLM Provider types and interfaces
 */
export interface LLMProvider {
    name: string;
    models: string[];
    maxTokens: number;
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
}
export interface LLMRequest {
    code: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}
export interface LLMResponse {
    suggestions: RenameSuggestion[];
    confidence: number;
    tokensUsed: number;
    processingTime: number;
}
export interface RenameSuggestion {
    originalName: string;
    suggestedName: string;
    confidence: number;
    reasoning?: string;
    type: 'variable' | 'function' | 'class' | 'method' | 'property';
}
//# sourceMappingURL=llm.d.ts.map