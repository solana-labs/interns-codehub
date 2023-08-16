module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "parser": "@typescript-eslint/parser",
  // "extends": "standard-with-typescript",
  "extends": ["plugin:@typescript-eslint/recommended", "eslint:recommended", "prettier", "prettier/@typescript-eslint"],
  "plugins": [
    "prettier"
  ],
  "overrides": [
    {
      "env": {
        "es6": true,
        "node": true
      },
      "files": [
        ".eslintrc.{js,cjs}"
      ],
      "parserOptions": {
        "sourceType": "script"
      }
    }
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "prettier/prettier": "error",
  }
}
