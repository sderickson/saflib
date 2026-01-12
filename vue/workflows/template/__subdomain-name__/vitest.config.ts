import { defaultConfig } from "@saflib/vue/vitest-config";
import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

export default defineConfig({
  ...defaultConfig,
  root: rootDir,
  resolve: {
    ...defaultConfig.resolve,
    alias: {
      ...defaultConfig.resolve?.alias,
      "~": rootDir,
    },
  },
});
