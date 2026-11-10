import { defineConfig } from "vitest/config";
import { defaultMaxWorkers } from "@saflib/vitest/vitest.config.js";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    // Shared with the other packages: Vitest 5.1 won't run projects with
    // different maxWorkers together (its default is cores - 1).
    maxWorkers: defaultMaxWorkers,
    root,
    globals: true,
    isolate: false,
    environment: "node",
    include: ["*.test.ts", "workflows/**/*.test.ts"],
  },
});
