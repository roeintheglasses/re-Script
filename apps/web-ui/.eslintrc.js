module.exports = {
  extends: ['@re-script/eslint-config', 'next/core-web-vitals'],
  rules: {
    // Next.js specific overrides
    '@next/next/no-img-element': 'off',
    'react/no-unescaped-entities': 'off',
  },
};