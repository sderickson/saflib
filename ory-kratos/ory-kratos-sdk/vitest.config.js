import { defineConfig } from "vitest/config";
import { defaultConfig } from "@saflib/vitest/vitest.config.js";

const baseCoverageExclude = defaultConfig.test?.coverage?.exclude ?? [];

/** jsdom: `withVueQuery` and mutation hooks need `document` for `createApp`. */
export default defineConfig({
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    environment: "jsdom",
    coverage: {
      ...defaultConfig.test?.coverage,
      exclude: [
        ...baseCoverageExclude,
        /** Barrel / registration-only — no runtime logic to cover. */
        "index.ts",
        "fakes.ts",
        "vue-query-register.ts",
        "vitest.config.js",
      ],
    },
  },
});
