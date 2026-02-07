import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      TZ: "UTC",
      NODE_OPTIONS: "--disable-warning=DEP0040",
    },

    projects: [
      // BEGIN WORKFLOW AREA test-product-dependencies FOR product/init
      "__product-name__/**/vitest.config.{ts,js,mts,mjs}",
      // END WORKFLOW AREA
    ],
  },
});
