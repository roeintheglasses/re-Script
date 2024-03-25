import { OllamaFunctions } from "langchain/experimental/chat_models/ollama_functions";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import LLMCodeInitialiser from "../../utils/llmCodeInitialiser.js";

async function OllamaMistralRenameUtility(code, apiKey = null) {
  const ollamaMistralModel = new OllamaFunctions({
    temperature: 0.1,
    model: "mistral",
    format: "json",
  }).bind({
    functions: [
      {
        name: "rebuild_minified_script",
        description: "Rename variables and function names in Javascript code",
        parameters: {
          type: "object",
          properties: {
            variablesAndFunctionsToRename: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description:
                      "The name of the variable or function name to rename",
                  },
                  newName: {
                    type: "string",
                    description:
                      "The new name of the variable or function name based on the context of the code",
                  },
                },
                required: ["name", "newName"],
              },
            },
          },
          required: ["variablesAndFunctionsToRename"],
        },
      },
    ],
    // You can set the `function_call` arg to force the model to use a function
    function_call: {
      name: "rebuild_minified_script",
    },
  });

  const result = await ollamaMistralModel.invoke([
    new HumanMessage(
      "You are a senior javascript programmer with experience in unminifying and deobfuscating code. Understand given code and rename all Javascript variables and functions to have descriptive names based on their usage in the code. Only give output in json format."
    ),
    new HumanMessage(code),
  ]);

  const initialOutput = result.additional_kwargs.function_call.arguments;

  const cleanOutput = SanitizeOpenAiOutput(initialOutput);

  const { variablesAndFunctionsToRename } = JSON.parse(cleanOutput);

  return variablesAndFunctionsToRename;
}
function SanitizeOpenAiOutput(jsonResponse) {
  return jsonResponse.replace(/},\s*]/im, "}]");
}

export default async function OllamaMistralLLMModifier(code, apiKey = null) {
  return await LLMCodeInitialiser(code, apiKey, OllamaMistralRenameUtility);
}
