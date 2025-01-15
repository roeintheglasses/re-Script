import { encode } from "gpt-3-encoder";
import * as fs from "fs";

const START_NEXT_CODE_BLOCK_AT_FRACTION = (1 / 5) * 4;
const SOFT_LIMIT_FRACTION = 1 / 4;
const HARD_LIMIT_FRACTION = 1 / 3;

export async function divideIntoCodeBlocks(code) {
  let codeBlocks = [];
  let currentCode = code;
  let i = 0;
  const numTokensForRequestAndResponse = 60000;
  const tokenSoftLimit = numTokensForRequestAndResponse * SOFT_LIMIT_FRACTION;
  const tokenHardLimit = numTokensForRequestAndResponse * HARD_LIMIT_FRACTION;

  while (currentCode.length > 0) {
    i++;
    console.log("DIVIDING");
    const { removedCode, remainingCode } = reduceAndEncodeCodeWithLimits(
      currentCode,
      {
        softLimit: tokenSoftLimit,
        hardLimit: tokenHardLimit,
      }
    );
    console.log("SAVING Code block");
    fs.writeFileSync(
      `./lib/utils/saves/codeBlock${i}.json`,
      JSON.stringify(removedCode, null, 2)
    );
    codeBlocks.push(removedCode);
    currentCode = remainingCode;
  }

  console.log("CODE DIVIDED LETS GOOO ");

  return codeBlocks;
}

function reduceAndEncodeCodeWithLimits(code, limits) {
  let stopAt = code.length;
  let lastStopOver = stopAt;

  while (true) {
    console.log("REDUCING ");
    const codeSlice = code.slice(0, stopAt);
    const numTokens = encode(codeSlice).length;
    if (numTokens > limits.hardLimit) {
      lastStopOver = stopAt;
      stopAt = Math.max(stopAt / 2);
      continue;
    }
    if (numTokens < limits.softLimit) {
      if (stopAt === lastStopOver) {
        // Cannot add any more code, stop here
        break;
      }

      stopAt = Math.max(stopAt + (lastStopOver - stopAt) / 2);
      continue;
    }

    break;
  }

  let removedCode = code.slice(0, stopAt);

  let remainingCode =
    stopAt === lastStopOver
      ? ""
      : code.slice(stopAt * START_NEXT_CODE_BLOCK_AT_FRACTION);
  return { removedCode, remainingCode };
}
