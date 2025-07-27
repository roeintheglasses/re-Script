export const MODEL_CONFIGS = {
  GPT4: {
    name: "gpt-4-0125-preview",
    temperature: 0.5,
    maxTokens: 4096,
  },
  CLAUDE3_OPUS: {
    name: "claude-3-opus-20240229",
    temperature: 0.5,
    maxTokens: 4096,
  },
  // Add more models as needed
};

export const SYSTEM_PROMPT =
  "You are a senior javascript programmer with experience in unminifying and deobfuscating code. " +
  "Understand given code and rename all Javascript variables and functions to have descriptive names based on their usage in the code.";

export const RENAME_FUNCTION_SCHEMA = {
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
              description: "The name of the variable or function name to rename",
            },
            newName: {
              type: "string",
              description: "The new name of the variable or function name based on the context of the code",
            },
          },
          required: ["name", "newName"],
        },
      },
    },
    required: ["variablesAndFunctionsToRename"],
  },
};