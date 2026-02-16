/*
Note: this file is in JS because for some reason, vitest-config.ts can't import TS files? Alas.
*/

import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import path from "node:path";

const setupFile = path.join(import.meta.dirname, "vitest-setup.js");

const baseTest = {
  environment: "jsdom",
  globals: true,
  exclude: ["**/e2e/**"],
  setupFiles: [setupFile],
  server: {
    deps: {
      inline: ["vuetify"],
    },
  },
  mockReset: true,
};

const baseCoverage = {
  provider: "v8",
  reporter: ["text", "html"],
  exclude: [
    // main and router files don't need to be unit tested
    // prefer e2e tests for those.
    "**/main.ts",
    "**/router.ts",

    // Clearly these don't need to be unit tested
    "*.config.*",
    "**/*.d.ts",
    "**/__mocks__",

    // Strings files are pure localization data with no logic
    "**/*.strings.ts",

    // Loader files are simple prefetch wrappers
    "**/*.loader.ts",

    // Test infrastructure
    "**/test-app.ts",
    "**/fixtures.ts",
  ],
};

/**
 * Default vitest config for Vue SPAs. Coverage is collected only when
 * you pass --coverage on the CLI.
 */
export const defaultConfig = defineConfig({
  plugins: [vue(), vuetify()],
  test: {
    ...baseTest,
    coverage: baseCoverage,
  },
});

/**
 * Vitest config that enforces coverage thresholds on every test run.
 * Coverage is always collected, and `npm run test` fails if thresholds
 * are not met — including when run by a workflow agent.
 */
export const defaultConfigWithCoverageEnforcement = defineConfig({
  plugins: [vue(), vuetify()],
  test: {
    ...baseTest,
    coverage: {
      ...baseCoverage,
      enabled: true,
      thresholds: {
        // Logic files: pure functions, should be exhaustively tested
        "**/*.logic.ts": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        // Global: achievable with render tests + logic/composable tests.
        // Functions threshold is lower because Vue template event handlers
        // show as uncovered functions in render-only tests.
        lines: 50,
        branches: 50,
        functions: 30,
        statements: 50,
      },
    },
  },
});
