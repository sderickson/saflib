import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fsModuleCache: true,
    isolate: false,
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    exclude: ["workflows/handler-template/**", "workflows/templates/**"],
  },
});
