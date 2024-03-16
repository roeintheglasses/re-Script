import { transformUsingBabelPlugins } from "./babelUtility.js";

const RESERVED_WORDS = [
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with",
  "yield",
];

function isReservedWord(word) {
  return RESERVED_WORDS.includes(word);
}

export async function renameHandler(code, toRename) {
  return await transformUsingBabelPlugins(code, [
    {
      visitor: {
        Identifier: (path) => {
          const rename = toRename.find((r) => r.name === path.node.name);
          if (rename)
            path.node.name = isReservedWord(rename.newName)
              ? `${rename.newName}$`
              : rename.newName;
        },
      },
    },
  ]);
}

export async function claudRenameHandler(code, toRename) {
  return await transformUsingBabelPlugins(code, [
    {
      visitor: {
        Identifier: (path) => {
          const rename = toRename.find((r) => r.name === path.node.name);
          if (rename)
            path.node.name = isReservedWord(rename.newName)
              ? `${rename.newName}$`
              : rename.newName;
        },
      },
    },
  ]);
}
