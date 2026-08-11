import { mergeConfig } from "vitest/config";
import { defaultConfig } from "@saflib/vitest/vitest.config.js";

export default mergeConfig(defaultConfig, {
  test: {
    exclude: [
      "**/workflows/service-templates/**",
      "**/node_modules/**",
      "**/dist/**",
    ],
  },
});
