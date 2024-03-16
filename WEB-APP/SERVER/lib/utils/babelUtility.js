import { transform } from "@babel/core";

export const transformUsingBabelPlugins = async (code, plugins) => {
  return await new Promise((resolve, reject) =>
    transform(
      code,
      {
        plugins,
        compact: false,
        minified: false,
        comments: false,
        sourceMaps: false,
        retainLines: false,
      },
      (err, result) => {
        if (err || !result) {
          reject(err);
        } else {
          resolve(result.code);
        }
      }
    )
  );
};
