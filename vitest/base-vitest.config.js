import os from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { importGraphReporters } from "./import-graph-reporter.js";

const testSetupFile = path.join(import.meta.dirname, "test-setup.ts");

/**
 * At most 4 workers. Each worker imports the test module graph cold before it
 * reuses it (isolate: false), so on a many-core machine Vitest's default
 * (cores - 1) spends more time on duplicate imports than it gains: 9 workers
 * ran a typical package's tests 20-28% slower than 4. Fewer cores are left
 * as Vitest would use them.
 */
export const defaultMaxWorkers = Math.max(
  1,
  Math.min(4, os.availableParallelism() - 1),
);

export const defaultConfig = defineConfig({
  test: {
    fsModuleCache: true,
    setupFiles: [testSetupFile],
    reporters: importGraphReporters(),
    // Reuse workers across test files (~350ms startup per file). Tests use MSW, spies, and temp
    // dirs instead of vi.mock so module state stays safe without per-file isolation.
    isolate: false,
    maxWorkers: defaultMaxWorkers,

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
