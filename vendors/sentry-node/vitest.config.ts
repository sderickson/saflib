import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    root,
    globals: true,
    isolate: false,
    environment: "node",
    include: ["workflows/**/*.test.ts"],
  },
});
