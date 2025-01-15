import { divideIntoCodeBlocks } from "./openAIEncoder.js";
import { mapPromisesParallely } from "./parallelPromises.js";
import { renameHandler } from "./renameHandler.js";
import * as fs from "fs";

export default async function LLMCodeInitialiser(
  code,
  apiKey,
  LLMRenameUtility
) {
  console.log("INSIDE LLM");
  // const codeBlocks = await divideIntoCodeBlocks(code);
  const codeBlocks = JSON.parse(fs.readFileSync("savecodeblock.json"));
  // console.log("SAVING CODE BLOCKS");
  // fs.writeFileSync("codeBlocks.json", JSON.stringify(codeBlocks, null, 2));
  console.log("CODE BLOCKS LENGTH : ", codeBlocks.length);
  let variablesAndFunctionsToRename = [];

  const promiseCallback = async (codeBlock, index) => {
    console.log(`PROMISE CALLBACK CALLED FOR INDEX: ${index + 1}`);
    let renames;
    if (fs.existsSync(`./lib/utils/renameSaves/renames${index + 1}.json`)) {
      renames = JSON.parse(
        fs.readFileSync(`./lib/utils/renameSaves/renames${index + 1}.json`)
      );
    } else {
      renames = await LLMRenameUtility(codeBlock, apiKey);
      fs.writeFileSync(
        `./lib/utils/renameSaves/renames${index + 1}.json`,
        JSON.stringify(renames, null, 2)
      );
    }

    variablesAndFunctionsToRename =
      variablesAndFunctionsToRename.concat(renames);
  };

  await mapPromisesParallely(2, codeBlocks, promiseCallback);
  fs.writeFileSync(
    "./lib/utils/variablesAndFunctionsToRename.json",
    JSON.stringify(variablesAndFunctionsToRename, null, 2)
  );
  return renameHandler(code, variablesAndFunctionsToRename);
}
