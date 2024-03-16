import prettier from "prettier";

export default async (code) => prettier.format(code, { parser: "babel" });
