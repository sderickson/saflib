import { defaultConfig } from "@saflib/vitest/vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      // Product-init stubs (__group-name__, etc.) are not runnable until renamed.
      exclude: ["**/__*__/**", "**/e2e/**"],
    },
  }),
);
