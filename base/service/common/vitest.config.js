import { defaultConfig } from "@saflib/vitest/vitest.config.js";

export default {
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    passWithNoTests: true,
  },
};
