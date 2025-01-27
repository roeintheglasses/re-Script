import babelTransform from "./modifiers/babelTransform.js";
import prettier from "./modifiers/prettier.js";
import webcrack from "./modifiers/webcrack.js";
import AnthropicLLMModifier from "./llms/anthropic.js";
import OpenAILLMModifier from "./llms/openai.js";

const MODEL_TYPES = {
  CLAUDE: 'claude',
  OPENAI: 'openAI',
}

const LLM_PROVIDERS = {
  [MODEL_TYPES.CLAUDE]: AnthropicLLMModifier,
  [MODEL_TYPES.OPENAI]: OpenAILLMModifier,
}

/**
 * Process and enhance code using various transformations and AI models
 * @param {string} code - The source code to process
 * @param {string} model - The AI model to use (claude, openAI, gemini, ollamaMistral)
 * @param {string} apiKey - API key for the AI service
 * @param {import("ora").Ora} spinner - Progress spinner instance
 * @returns {Promise<string>} The processed code
 * @throws {Error} If an invalid model is specified or processing fails
 */
export default async function rescript(code, model, apiKey, spinner) {
  try {
    // Step 1: Reverse bundling
    spinner.color = "orange";
    spinner.text = "Reversing Bundling process...";
    const { code: crackedCode } = await webcrack(code);

    // Step 2: Apply Babel transformations
    spinner.text = "Injecting Babel plugins...";
    const babelifiedCode = await babelTransform(crackedCode);

    // Step 3: Apply AI model transformations
    spinner.color = "yellow";
    spinner.text = "Using AI model to decode logic...";

    const llmModifier = LLM_PROVIDERS[model];
    if (!llmModifier) {
      throw new Error(`Unsupported AI model: ${model}`);
    }

    const llmUpdatedCode = await llmModifier(babelifiedCode, apiKey);

    // Step 4: Format the final code
    spinner.color = "green";
    spinner.text = "Formatting code...";
    const formattedCode = await prettier(llmUpdatedCode);

    return formattedCode;
  } catch (error) {
    spinner.fail(`Error processing code: ${error.message}`);
    throw error;
  }
}
