import { defaultConfig } from "@saflib/vitest/vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  defaultConfig,
  defineConfig({
    test: {
      // Stub dirs under this package (double-underscore names) are not runnable until renamed.
      exclude: ["**/__*__/**", "**/e2e/**"], /* do not replace */
    },
  }),
);
