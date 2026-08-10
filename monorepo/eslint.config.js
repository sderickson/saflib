import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginVue from "eslint-plugin-vue";
import globals from "globals";
import typescriptEslint from "typescript-eslint";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

const sharedParserOptions = { tsconfigRootDir };

const withTsconfigRoot = (config) => ({
  ...config,
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...config.languageOptions?.parserOptions,
      ...sharedParserOptions,
    },
  },
});

// TODO: Add linters for everything other than "clients"

export const config = typescriptEslint.config(
  { ignores: ["*.d.ts", "**/coverage", "**/dist", "**/cache", "eslint.config.js"] },
  {
    languageOptions: {
      parserOptions: sharedParserOptions,
    },
  },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended.map(withTsconfigRoot),
      ...eslintPluginVue.configs["flat/recommended"],
    ],
    files: ["clients/**/*.{ts,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        parser: typescriptEslint.parser,
        ...sharedParserOptions,
      },
    },
    rules: {
      // Allow unused variables when they are prefixed with "_"
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  eslintConfigPrettier,
);
