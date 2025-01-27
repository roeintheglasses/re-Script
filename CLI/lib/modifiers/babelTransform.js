import { transformUsingBabelPlugins } from "../utils/babelUtility.js";
import * as t from "@babel/types";

// Constants for common operators
const COMPARISON_OPERATORS = {
  "==": "==",
  "!=": "!=",
  "===": "===",
  "!==": "!==",
  "<": ">",
  "<=": ">=",
  ">": "<",
  ">=": "<=",
};

const babelPlugins = {
  convertVoidIntoUndefined: {
    visitor: {
      UnaryExpression(path) {
        const { node } = path;
        if (
          node.operator === "void" &&
          t.isNumericLiteral(node.argument) &&
          node.argument.value === 0
        ) {
          path.replaceWith(t.identifier("undefined"));
        }
      },
    },
  },

  flipComparisonsRightWay: {
    visitor: {
      BinaryExpression(path) {
        const { node } = path;
        if (
          t.isLiteral(node.left) &&
          !t.isLiteral(node.right) &&
          COMPARISON_OPERATORS[node.operator]
        ) {
          path.replaceWith(
            t.binaryExpression(
              COMPARISON_OPERATORS[node.operator],
              node.right,
              node.left
            )
          );
        }
      },
    },
  },

  makeNumbersLonger: {
    visitor: {
      NumericLiteral(path) {
        const { node } = path;
        if (node.extra?.raw?.includes("e")) {
          path.replaceWith(t.numericLiteral(Number(node.extra.raw)));
        }
      },
    },
  },
};

export default async function transform(code) {
  try {
    return await transformUsingBabelPlugins(code, [
      babelPlugins.convertVoidIntoUndefined,
      babelPlugins.flipComparisonsRightWay,
      babelPlugins.makeNumbersLonger,
      "transform-beautifier",
    ]);
  } catch (error) {
    console.error("Babel transformation failed:", error);
    throw error;
  }
}