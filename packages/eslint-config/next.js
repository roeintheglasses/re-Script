module.exports = {
  extends: [
    "./index.js",
    "next/core-web-vitals"
  ],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  rules: {
    // Next.js specific rules
    "@next/next/no-html-link-for-pages": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
};