import { defineConfig } from "vitest/config";
import { defaultMaxWorkers } from "@saflib/vitest/vitest.config.js";

export default defineConfig({
  test: {
    // Shared with the other packages: Vitest 5.1 won't run projects with
    // different maxWorkers together (its default is cores - 1).
    maxWorkers: defaultMaxWorkers,
    environment: "node",
    include: ["src/**/*.test.ts"],
    isolate: true,
  },
});
