import babelTransform from "./modifiers/bableTransform.js";
import prettier from "./modifiers/prettier.js";
import webcrack from "./modifiers/webcrack.js";
import AnthropicLLMModifier from "./llms/anthropic.js";
import OpenAILLMModifier from "./llms/openai.js";

import ora from "ora";

/**
 *
 * @param {string} code
 * @param {string} model
 * @param {string} apiKey
 * @param {ora} oraLoggerInstance
 * @returns
 */
export default async function rescript(code, model, apiKey, oraLoggerInstance) {
  oraLoggerInstance("Reversing Bundling process...");
  const crackedCodeInstance = await webcrack(code);
  const crackedCode = crackedCodeInstance.code;

  oraLoggerInstance("Injecting Babel plugins...");
  const babelifiedCode = await babelTransform(crackedCode);

  let llmUpdatedCode = babelifiedCode;

  oraLoggerInstance("Using AI model to decode logic...");
  if (model === "claude") {
    llmUpdatedCode = await AnthropicLLMModifier(babelifiedCode, apiKey);
  } else if (model === "openAI") {
    llmUpdatedCode = await OpenAILLMModifier(babelifiedCode, apiKey);
  } else if (model === "gemini") {
  }
  oraLoggerInstance("Formatting code...");
  const formattedCode = await prettier(llmUpdatedCode);

  return formattedCode;
}
