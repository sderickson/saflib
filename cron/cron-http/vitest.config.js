import { defaultConfig } from "@saflib/vitest/vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      exclude: ["**/workflows/templates/**", "**/e2e/**"],
    },
  }),
);
