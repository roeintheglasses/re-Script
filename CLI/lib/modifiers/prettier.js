import prettier from "prettier";

const DEFAULT_OPTIONS = {
  parser: "babel",
  printWidth: 80,
  tabWidth: 2,
  semi: true,
  singleQuote: false,
};

export default async function format(code, customOptions = {}) {
  try {
    return await prettier.format(code, {
      ...DEFAULT_OPTIONS,
      ...customOptions,
    });
  } catch (error) {
    console.error("Prettier formatting failed:", error);
    throw error;
  }
}
