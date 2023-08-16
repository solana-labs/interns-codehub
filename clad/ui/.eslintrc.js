module.exports = {
  env: {
    'browser': true,
    'es2021': true
  },
  parser: '@typescript-eslint/parser',
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'prettier/@typescript-eslint'
  ],
  plugins: [
    'prettier'
  ],
  parserOptions: {
    'ecmaVersion': 'latest',
    'sourceType': 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    'semi': 'off',
  }
}