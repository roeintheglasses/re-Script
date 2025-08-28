module.exports = {
  extends: ["./index.js"],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // Node.js specific rules
    "no-process-exit": "error",
    "no-process-env": "off"
  }
};