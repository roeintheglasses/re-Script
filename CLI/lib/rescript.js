import babelTransform from "./modifiers/bableTransform.js";
import prettier from "./modifiers/prettier.js";
import webcrack from "./modifiers/webcrack.js";
import AnthropicLLMModifier from "./llms/anthropic.js";
import OpenAILLMModifier from "./llms/openai.js";
import OllamaMistralLLMModifier from "./llms/ollama/mistral.js";

/**
 *
 * @param {string} code
 * @param {string} model
 * @param {string} apiKey
 * @param {import("ora").Ora} spinner
 * @returns
 */
export default async function rescript(code, model, apiKey, spinner) {
  spinner.color = "orange";
  spinner.text = "Reversing Bundling process...";
  const crackedCodeInstance = await webcrack(code);
  const crackedCode = crackedCodeInstance.code;
  console.log("CODE CRACKED");
  spinner.text = "Injecting Babel plugins...";
  const babelifiedCode = await babelTransform(code);
  console.log("BABE TRANSFORMED, CODE READY FOR LLM");
  let llmUpdatedCode = babelifiedCode;

  spinner.color = "yellow";
  spinner.text = "Using AI model to decode logic...";
  if (model === "claude") {
    llmUpdatedCode = await AnthropicLLMModifier(babelifiedCode, apiKey);
  } else if (model === "openAI") {
    llmUpdatedCode = await OpenAILLMModifier(babelifiedCode, apiKey);
  } else if (model === "gemini") {
  } else if (model === "ollamaMistral") {
    llmUpdatedCode = await OllamaMistralLLMModifier(babelifiedCode);
  }

  spinner.color = "green";
  spinner.text = "Formatting code...";
  const formattedCode = await prettier(llmUpdatedCode);

  return formattedCode;
}
