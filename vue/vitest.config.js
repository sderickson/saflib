import { defaultConfig } from "./testing/vitest-config.js";

export default {
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    // Exclude template directories - they have their own vitest configs
    exclude: [
      ...(defaultConfig.test?.exclude || []),
      "**/workflows/template/**",
    ],
  },
};
