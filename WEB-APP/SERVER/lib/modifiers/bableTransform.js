import { transformUsingBabelPlugins } from "../utils/babelUtility.js";
import * as t from "@babel/types";

const convertVoidIntoUndefined = {
  visitor: {
    // Convert `void 0` to `undefined`
    UnaryExpression(path) {
      if (
        path.node.operator === "void" &&
        path.node.argument.type === "NumericLiteral"
      ) {
        path.replaceWith({
          type: "Identifier",
          name: "undefined",
        });
      }
    },
  },
};

const flipComparisonsRightWay = {
  visitor: {
    // Flip comparisons so that they are the right way around
    BinaryExpression(path) {
      const node = path.node;
      const mappings = {
        "==": "==",
        "!=": "!=",
        "===": "===",
        "!==": "!==",
        "<": ">",
        "<=": ">=",
        ">": "<",
        ">=": "<=",
      };
      if (
        t.isLiteral(node.left) &&
        !t.isLiteral(node.right) &&
        mappings[node.operator]
      ) {
        path.replaceWith({
          ...node,
          left: node.right,
          right: node.left,
          operator: mappings[node.operator],
        });
      }
    },
  },
};

const makeNumbersLonger = {
  visitor: {
    // Make numbers longer so that they can be used in comparisons
    NumericLiteral(path) {
      if (
        typeof path.node.extra?.raw === "string" &&
        path.node.extra?.raw?.includes("e")
      ) {
        path.replaceWith({
          type: "NumericLiteral",
          value: Number(path.node.extra.raw),
        });
      }
    },
  },
};

export default async (code) =>
  transformUsingBabelPlugins(code, [
    convertVoidIntoUndefined,
    flipComparisonsRightWay,
    makeNumbersLonger,
    "transform-beautifier",
  ]);
