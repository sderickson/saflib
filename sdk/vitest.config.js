import { defaultConfig } from "@saflib/vue/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      exclude: ["**/workflows/templates/**", "**/e2e/**"],
    },
  }),
);
