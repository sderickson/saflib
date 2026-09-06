/*
Note: this file is in JS because for some reason, vitest-config.ts can't import TS files? Alas.
*/

import { defineConfig } from "vitest/config";
import { searchForWorkspaceRoot } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const setupFile = fileURLToPath(new URL("./vitest-setup.js", import.meta.url));
const vuePackageRoot = path.resolve(path.dirname(setupFile), "..");
const workspaceRoot = searchForWorkspaceRoot(process.cwd());

/** Paths Vite may read when resolving @saflib/* and platform test setup. */
function buildFsAllow() {
  const allow = [workspaceRoot];
  const saflibSubmodule = path.join(workspaceRoot, "saflib");
  if (existsSync(saflibSubmodule)) {
    allow.push(realpathSync(saflibSubmodule));
  }
  if (
    vuePackageRoot !== workspaceRoot &&
    !allow.includes(vuePackageRoot)
  ) {
    allow.push(vuePackageRoot);
  }
  return allow;
}

const fsAllow = buildFsAllow();

const baseTest = {
  environment: "jsdom",
  globals: true,
  exclude: ["**/e2e/**"],
  setupFiles: ["@saflib/vue/testing/vitest-setup"],
  env: {
    NODE_OPTIONS:
      "--disable-warning=DEP0040 --disable-warning=ExperimentalWarning",
  },
  // SPAs may have no unit tests until add-view extracts logic/composables.
  passWithNoTests: true,
  // Default Vitest is 5s; AsyncPage + MSW + dynamic imports use asyncUiWaitForOptions (10s).
  testTimeout: 15_000,
  server: {
    fs: {
      allow: fsAllow,
    },
    deps: {
      inline: ["vuetify", "vue-router"],
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

    // Vue SFCs: thin templates; behavior is covered by Playwright and
    // by component tests that exercise interactions (not render smokes).
    "**/*.vue",

    // Test infrastructure
    "**/test-app.ts",
    "**/*.fixture.ts",
    "**/fixtures.ts",
    "**/fixtures/**",
  ],
};

const baseResolve = {
  dedupe: [
    "vue",
    "vue-router",
    "vuetify",
    "vue-i18n",
    "@vue/runtime-core",
    "@vue/runtime-dom",
    "@vue/reactivity",
    "@vue/shared",
  ],
};

/**
 * Default vitest config for Vue SPAs. Coverage is collected only when
 * you pass --coverage on the CLI.
 *
 * Root and saflib can each hoist Vue; mixed runtimes break AsyncPage /
 * Vuetify. A host monorepo's postinstall may remove nested saflib copies when
 * the root copy is present.
 */
export const defaultConfig = defineConfig({
  plugins: [vue(), vuetify()],
  resolve: baseResolve,
  server: {
    fs: {
      allow: fsAllow,
    },
  },
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
  resolve: baseResolve,
  server: defaultConfig.server,
  test: {
    ...baseTest,
    coverage: {
      ...baseCoverage,
      enabled: true,
      thresholds: {
        // Each file must independently meet thresholds — prevents high-coverage
        // logic files from masking untested Vue files or utilities.
        perFile: true,

        // Logic files: pure functions, should be exhaustively tested
        "**/*.logic.ts": {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },

        // Composables with networking: integration-tested with mock server
        "**/use*.ts": {
          lines: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
});
