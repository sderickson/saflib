import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    root,
    globals: true,
    environment: "node",
    include: ["workflows/**/*.test.ts"],
  },
});
