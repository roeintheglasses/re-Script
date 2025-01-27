import { ChatAnthropicTools } from "@langchain/anthropic/experimental";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";


import { MODEL_CONFIGS, SYSTEM_PROMPT, RENAME_FUNCTION_SCHEMA } from "../config/config.js";

import processCodeWithLLM from "../utils/llmCodeInitialiser.js";
import { sanitizeJsonOutput, restructureVariables } from "../utils/renameHandler.js";

async function AnthropicRenameUtility(code, apiKey, modelName = "CLAUDE3_OPUS") {
  if (!code || !apiKey) {
    return null;
  }

  const model = new ChatAnthropicTools({
    modelName: MODEL_CONFIGS[modelName].name,
    anthropicApiKey: apiKey,
    maxTokens: MODEL_CONFIGS[modelName].maxTokens,
  }).bind({
    tools: [
      {
        type: "function",
        function: RENAME_FUNCTION_SCHEMA,
      },
    ],
    tool_choice: {
      type: "function",
      function: {
        name: RENAME_FUNCTION_SCHEMA.name,
      },
    },
  });

  const result = await model.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(code),
  ]);

  const initialOutput = result.additional_kwargs.tool_calls[0].function.arguments;
  const cleanOutput = sanitizeJsonOutput(initialOutput);
  const { variablesAndFunctionsToRename } = JSON.parse(cleanOutput);

  return restructureVariables(variablesAndFunctionsToRename);
}

export default async function AnthropicLLMModifier(code, apiKey, modelName) {
  return await processCodeWithLLM(code, apiKey, (code, apiKey) =>
    AnthropicRenameUtility(code, apiKey, modelName)
  );
}
