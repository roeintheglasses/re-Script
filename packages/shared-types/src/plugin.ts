/**
 * Plugin system types and interfaces
 */

import { ProcessingInput, ProcessingOutput, ProcessingError } from './processing.js';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  transformers?: Transformer[];
  hooks?: PluginHooks;
}

export interface Transformer {
  name: string;
  stage: 'pre' | 'post' | 'llm';
  transform(input: ProcessingInput): Promise<ProcessingOutput>;
}

export interface PluginHooks {
  beforeProcessing?: (input: ProcessingInput) => Promise<ProcessingInput>;
  afterProcessing?: (output: ProcessingOutput) => Promise<ProcessingOutput>;
  onError?: (error: ProcessingError) => Promise<void>;
}