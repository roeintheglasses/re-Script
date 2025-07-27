/**
 * Example Prettier transformer plugin
 */

import { format } from 'prettier';
import { TransformerPlugin, PluginContext } from '../types.js';

export const prettierTransformerPlugin: TransformerPlugin = {
  metadata: {
    name: 'prettier-transformer',
    version: '1.0.0',
    description: 'Formats JavaScript code using Prettier',
    author: 're-Script Team',
    category: 'transformer',
    tags: ['formatting', 'prettier', 'code-style'],
  },

  async canHandle(input: string, context: PluginContext): Promise<boolean> {
    // Check if input looks like JavaScript code
    const jsPatterns = [
      /function\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /class\s+\w+/,
      /=>\s*{/,
    ];

    return jsPatterns.some(pattern => pattern.test(input));
  },

  async transform(input: string, context: PluginContext): Promise<string> {
    try {
      context.utils.log('info', 'Formatting code with Prettier');

      const formatted = await format(input, {
        parser: 'babel',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 100,
        // Allow configuration override from plugin config
        ...((context as any).config?.prettier || {}),
      });

      context.utils.log('info', 'Code formatting completed');
      return formatted;

    } catch (error) {
      context.utils.log('warn', `Prettier formatting failed: ${error}`);
      // Return original input if formatting fails
      return input;
    }
  },

  async init(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Prettier transformer plugin initialized');
  },

  async cleanup(context: PluginContext): Promise<void> {
    context.utils.log('info', 'Prettier transformer plugin cleaned up');
  },
};

export default prettierTransformerPlugin;