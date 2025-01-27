import { encode } from "gpt-3-encoder";

// Configuration constants
const CONFIG = {
  MAX_TOKENS: 16000, // Maximum tokens for request and response
  OVERLAP_RATIO: 0.2, // 20% overlap between blocks
  TOKEN_LIMITS: {
    SOFT: 0.25, // 25% of max tokens
    HARD: 0.33, // 33% of max tokens
  }
};

/**
 * Divides code into smaller blocks while respecting token limits
 * @param {string} code - The source code to divide
 * @returns {Promise<string[]>} Array of code blocks
 */
export async function divideIntoCodeBlocks(code) {
  const blocks = [];
  let remainingCode = code;

  const tokenLimits = {
    soft: CONFIG.MAX_TOKENS * CONFIG.TOKEN_LIMITS.SOFT,
    hard: CONFIG.MAX_TOKENS * CONFIG.TOKEN_LIMITS.HARD
  };

  while (remainingCode.length > 0) {
    const { block, remaining } = findOptimalCodeBlock(remainingCode, tokenLimits);
    blocks.push(block);
    remainingCode = remaining;
  }

  return blocks;
}

/**
 * Finds the optimal size for a code block using binary search
 * @param {string} code - Code to process
 * @param {Object} limits - Token limits configuration
 * @returns {Object} Object containing the block and remaining code
 */
function findOptimalCodeBlock(code, limits) {
  let left = 0;
  let right = code.length;
  let lastValidSize = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const slice = code.slice(0, mid);
    const tokenCount = encode(slice).length;

    if (tokenCount > limits.hard) {
      right = mid - 1;
    } else if (tokenCount < limits.soft && mid < code.length) {
      left = mid + 1;
      lastValidSize = mid;
    } else {
      lastValidSize = mid;
      break;
    }
  }

  const block = code.slice(0, lastValidSize);
  const overlapPoint = Math.floor(lastValidSize * (1 - CONFIG.OVERLAP_RATIO));
  const remaining = lastValidSize === code.length ? "" : code.slice(overlapPoint);

  return { block, remaining };
}
