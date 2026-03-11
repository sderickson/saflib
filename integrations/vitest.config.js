import { defineConfig, mergeConfig } from "vitest/config";
import { defaultConfig } from "@saflib/vitest/vitest.config.js";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      exclude: ["**/templates/**"],
    },
  }),
);
