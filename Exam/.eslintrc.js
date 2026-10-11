module.exports = {
  root: true,
  extends: ['eslint:recommended', 'prettier'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    'no-useless-escape': 'off',
    'no-empty': 'off',
    'no-undef': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.turbo/',
    'coverage/',
    '*.min.js',
    'build/',
  ],
};
