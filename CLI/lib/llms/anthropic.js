import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatAnthropicTools } from "@langchain/anthropic/experimental";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import LLMCodeInitialiser from "../utils/llmCodeInitialiser.js";

async function AnthropicRenameUtility(code, apiKey) {
  const anthropicModel = new ChatAnthropicTools({
    modelName: "claude-3-opus-20240229",
    anthropicApiKey: apiKey,
    maxTokens: 4096,
  }).bind({
    tools: [
      {
        type: "function",
        function: {
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
            required: ["variablesToRename"],
          },
        },
      },
    ],
    // You can set the `function_call` arg to force the model to use a function
    tool_choice: {
      type: "function",
      function: {
        name: "rebuild_minified_script",
      },
    },
  });

  let initialOutput = (
    await anthropicModel.invoke([
      new SystemMessage(
        "You are a senior javascript programmer with experience in unminifying and deobfuscating code. Understand given code and rename all Javascript variables and functions to have descriptive names based on their usage in the code."
      ),
      new HumanMessage(code),
    ])
  ).additional_kwargs.tool_calls[0].function.arguments;
  const cleanOutput = SanatiseOpenAiOutput(initialOutput);

  const { variablesAndFunctionsToRename } = JSON.parse(cleanOutput);

  const { name, newName } = variablesAndFunctionsToRename[0];

  const reStructuredVariablesAndFunctionsToRename = [];

  for (let i = 0; i < Math.min(name.length, newName.length); i++) {
    reStructuredVariablesAndFunctionsToRename.push({
      name: name[i],
      newName: newName[i],
    });
  }

  return reStructuredVariablesAndFunctionsToRename;
}
function SanatiseOpenAiOutput(jsonResponse) {
  return jsonResponse.replace(/},\s*]/im, "}]");
}

export default async function OpenAILLMModifier(code, apiKey) {
  return await LLMCodeInitialiser(code, apiKey, AnthropicRenameUtility);
}
