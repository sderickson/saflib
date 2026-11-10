import { defineConfig } from "vitest/config";
import { defaultMaxWorkers } from "@saflib/vitest/vitest.config.js";

export default defineConfig({
  test: {
    // Shared with the other packages: Vitest 5.1 won't run projects with
    // different maxWorkers together (its default is cores - 1).
    maxWorkers: defaultMaxWorkers,
    fsModuleCache: true,
    // docker.test.ts mocks node:fs (memfs); with shared modules, whichever
    // file loads @saflib/monorepo or ./docker.ts first decides whether that
    // mock applies, so results would depend on how CI spreads files.
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
        "generate.ts",
        "**/*.mock.*",
        "__mocks__",
        "vitest.config.js",
      ],
    },
  },
});
