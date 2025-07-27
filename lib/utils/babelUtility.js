import { transform } from "@babel/core";

/**
 * Transforms code using specified Babel plugins
 * @param {string} code - Source code to transform
 * @param {Array} plugins - Array of Babel plugins to apply
 * @returns {Promise<string>} Transformed code
 * @throws {Error} If transformation fails
 */
export const transformUsingBabelPlugins = (code, plugins) => {
  const babelOptions = {
    plugins,
    compact: false,
    minified: false,
    comments: false,
    sourceMaps: false,
    retainLines: false,
  };

  return new Promise((resolve, reject) => {
    try {
      transform(code, babelOptions, (error, result) => {
        if (error || !result) {
          reject(error || new Error('Babel transformation failed with no result'));
          return;
        }
        resolve(result.code);
      });
    } catch (error) {
      reject(error);
    }
  });
};
