import { transformUsingBabelPlugins } from "./babelUtility.js";

const RESERVED_WORDS = new Set([
  "abstract", "arguments", "await", "boolean", "break",
  "byte", "case", "catch", "char", "class",
  "const", "continue", "debugger", "default", "delete",
  "do", "double", "else", "enum", "eval",
  "export", "extends", "false", "final", "finally",
  "float", "for", "function", "goto", "if",
  "implements", "import", "in", "instanceof", "int",
  "interface", "let", "long", "native", "new",
  "null", "package", "private", "protected", "public",
  "return", "short", "static", "super", "switch",
  "synchronized", "this", "throw", "throws", "transient",
  "true", "try", "typeof", "var", "void",
  "volatile", "while", "with", "yield"
]);

/**
 * Checks if a word is a JavaScript reserved word
 * @param {string} word - The word to check
 * @returns {boolean} True if the word is reserved
 */
function isReservedWord(word) {
  return RESERVED_WORDS.has(word);
}

/**
 * Validates the rename operations input
 * @param {string} code - The source code to transform
 * @param {Array<{name: string, newName: string}>} toRename - Array of rename operations
 * @throws {Error} If inputs are invalid
 */
function validateInput(code, toRename) {
  if (typeof code !== 'string') {
    throw new Error('Code must be a string');
  }
  if (!Array.isArray(toRename)) {
    throw new Error('toRename must be an array');
  }
  if (!toRename.every(r => r && typeof r.name === 'string' && typeof r.newName === 'string')) {
    throw new Error('Each rename operation must have name and newName strings');
  }
}

/**
 * Handles renaming of identifiers in JavaScript code
 * @param {string} code - The source code to transform
 * @param {Array<{name: string, newName: string}>} toRename - Array of rename operations
 * @returns {Promise<string>} Transformed code
 * @throws {Error} If inputs are invalid
 */
export async function renameHandler(code, toRename) {
  validateInput(code, toRename);

  // Create a Map for O(1) lookup of rename operations
  const renameMap = new Map(toRename.map(r => [r.name, r.newName]));

  return await transformUsingBabelPlugins(code, [
    {
      visitor: {
        Identifier: (path) => {
          const newName = renameMap.get(path.node.name);
          if (newName) {
            path.node.name = isReservedWord(newName)
              ? `${newName}$`
              : newName;
          }
        },
      },
    },
  ]);
}

/**
 * Sanitizes JSON output by fixing common formatting issues
 * @param {string} jsonResponse - The JSON string to sanitize
 * @returns {string} Sanitized JSON string with proper formatting
 */
export function sanitizeJsonOutput(jsonResponse) {
  return jsonResponse.replace(/},\s*]/im, "}]");
}

/**
 * Restructures variables and functions to rename into a consistent format
 * @param {Array<{name: string[], newName: string[]} | {name: string, newName: string}>} variablesAndFunctionsToRename - Array of rename operations
 * @returns {Array<{name: string, newName: string}>} Restructured array of rename operations
 */
export function restructureVariables(variablesAndFunctionsToRename) {
  if (!Array.isArray(variablesAndFunctionsToRename)) {
    return variablesAndFunctionsToRename;
  }

  // Check if the response is already in the correct format
  if (typeof variablesAndFunctionsToRename[0]?.name === 'string') {
    return variablesAndFunctionsToRename;
  }

  const { name, newName } = variablesAndFunctionsToRename[0];
  const restructured = [];

  for (let i = 0; i < Math.min(name.length, newName.length); i++) {
    restructured.push({
      name: name[i],
      newName: newName[i],
    });
  }

  return restructured;
}