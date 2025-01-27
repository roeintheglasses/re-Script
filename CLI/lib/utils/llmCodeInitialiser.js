import { divideIntoCodeBlocks } from "./openAIEncoder.js";
import { mapPromisesParallely } from "./parallelPromises.js";
import { renameHandler } from "./renameHandler.js";

/**
 * Processes code through LLM to identify and rename variables and functions
 * @param {string} sourceCode - The source code to process
 * @param {string} apiKey - API key for the LLM service
 * @param {Function} llmRenameFunction - Function to process rename suggestions
 * @returns {Promise<string>} - The processed code with renamed variables/functions
 * @throws {Error} If invalid inputs are provided or processing fails
 */
export default async function processCodeWithLLM(
  sourceCode,
  apiKey,
  llmRenameFunction
) {
  // Input validation
  if (!sourceCode || typeof sourceCode !== 'string') {
    throw new Error('Source code must be a non-empty string');
  }
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Valid API key is required');
  }
  if (typeof llmRenameFunction !== 'function') {
    throw new Error('LLM rename function is required');
  }

  try {
    const codeBlocks = await divideIntoCodeBlocks(sourceCode);

    // Process code blocks in parallel and collect rename suggestions
    const renameSuggestions = await mapPromisesParallely(
      5,
      codeBlocks,
      async (codeBlock) => await llmRenameFunction(codeBlock, apiKey)
    );

    // Flatten the array of rename suggestions
    const allRenameSuggestions = renameSuggestions.flat();

    // Apply all rename suggestions to the source code
    return renameHandler(sourceCode, allRenameSuggestions);
  } catch (error) {
    throw new Error(`Failed to process code: ${error.message}`);
  }
}
