import { defaultConfig } from "@saflib/vue/vitest-config";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  ...defaultConfig,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve?.alias,
      "~": path.resolve(import.meta.dirname, "."),
    },
  },
});
