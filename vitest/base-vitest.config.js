import { defineConfig } from "vitest/config";

export const defaultConfig = defineConfig({
  test: {
    /*
     * By default, isolate tests. There's no apparent change in performance, but sometimes tests
     * will break in CI or when you run them locally with --no-file-parallelism, particularly when
     * a set of tests require different vi.mock setups. For example, one test might mock an
     * external dependency, but another runs first and imports the file that would receive the mock.
     * It will not because that file will have already been loaded.
     *
     * So, removing test isolation is opt-in. Seems best when testing purely functional code. No
     * mocks, no globals, no side effects.
     */
    isolate: true,

    environment: "node",
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
});
