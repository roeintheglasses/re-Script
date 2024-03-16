import { divideIntoCodeBlocks } from "./openAIEncoder.js";
import { mapPromisesParallely } from "./parallelPromises.js";
import { renameHandler } from "./renameHandler.js";

export default async function LLMCodeInitialiser(
  code,
  apiKey,
  LLMRenameUtility
) {
  const codeBlocks = await divideIntoCodeBlocks(code);
  let variablesAndFunctionsToRename = [];
  const promiseCallback = async (codeBlock) => {
    const renames = await LLMRenameUtility(codeBlock, apiKey);
    variablesAndFunctionsToRename =
      variablesAndFunctionsToRename.concat(renames);
  };
  await mapPromisesParallely(10, codeBlocks, promiseCallback);

  return renameHandler(code, variablesAndFunctionsToRename);
}
