import path from "node:path";
import { defineConfig } from "vitest/config";
import { importGraphReporters } from "./import-graph-reporter.js";

const testSetupFile = path.join(import.meta.dirname, "test-setup.ts");

export const defaultConfig = defineConfig({
  test: {
    fsModuleCache: true,
    setupFiles: [testSetupFile],
    reporters: importGraphReporters(),
    // Reuse workers across test files (~350ms startup per file). Tests use MSW, spies, and temp
    // dirs instead of vi.mock so module state stays safe without per-file isolation.
    isolate: false,

    environment: "node",
    env: {
      TZ: "UTC",
      NODE_OPTIONS: "--disable-warning=DEP0040 --disable-warning=ExperimentalWarning",
      NODE_ENV: "test",
    },
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "migrations/**",
        "vitest.config.js",
      ],
    },
  },
  resolve: {
    alias: {
      // Prevent Vite from resolving Node built-in "stream" as a relative path
      stream: "node:stream",
    },
  },
});
