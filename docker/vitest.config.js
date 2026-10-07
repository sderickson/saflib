import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
