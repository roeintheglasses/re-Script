import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import processCodeWithLLM from "../utils/llmCodeInitialiser.js";
import { MODEL_CONFIGS, SYSTEM_PROMPT, RENAME_FUNCTION_SCHEMA } from "../config/config.js";
import { sanitizeJsonOutput } from "./renameUtils.js";

async function OpenAiRenameUtility(code, apiKey, modelName = "GPT4") {
  if (!code || !apiKey) {
    return null;
  }

  const model = new ChatOpenAI({
    modelName: MODEL_CONFIGS[modelName].name,
    temperature: MODEL_CONFIGS[modelName].temperature,
    openAIApiKey: apiKey,
  });

  const result = await model.invoke(
    [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(code),
    ],
    {
      functions: [RENAME_FUNCTION_SCHEMA],
      function_call: {
        name: RENAME_FUNCTION_SCHEMA.name,
      },
    }
  );

  const initialOutput = result.additional_kwargs.function_call.arguments;
  const cleanOutput = sanitizeJsonOutput(initialOutput);
  const { variablesAndFunctionsToRename } = JSON.parse(cleanOutput);

  return variablesAndFunctionsToRename;
}

export default async function OpenAILLMModifier(code, apiKey, modelName) {
  return await processCodeWithLLM(code, apiKey, (code, apiKey) =>
    OpenAiRenameUtility(code, apiKey, modelName)
  );
}
