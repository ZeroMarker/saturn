import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn"] }],
    },
  },
  {
    ignores: ["dist/"],
  },
];
