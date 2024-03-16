import babelTransform from "./modifiers/bableTransform.js";
import prettier from "./modifiers/prettier.js";
import webcrack from "./modifiers/webcrack.js";
import AnthropicLLMModifier from "./llms/anthropic.js";
import OpenAILLMModifier from "./llms/openai.js";

export default async function rescript(code, model, apiKey) {
  const crackedCodeInstance = await webcrack(code);
  const crackedCode = crackedCodeInstance.code;

  const babelifiedCode = await babelTransform(crackedCode);

  console.log("====================================");
  console.log({ model, apiKey });
  console.log("====================================");

  let llmUpdatedCode = babelifiedCode;

  if (model === "claude") {
    llmUpdatedCode = await AnthropicLLMModifier(babelifiedCode, apiKey);
  } else if (model === "openAI") {
    llmUpdatedCode = await OpenAILLMModifier(babelifiedCode, apiKey);
  } else if (model === "gemini") {
  }

  const formattedCode = await prettier(llmUpdatedCode);

  return formattedCode;
}
