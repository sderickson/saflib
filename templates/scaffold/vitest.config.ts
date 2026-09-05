import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      TZ: "UTC",
      NODE_OPTIONS: "--disable-warning=DEP0040",
    },

    projects: [
      // BEGIN WORKFLOW AREA test-product-dependencies FOR product/init
      // END WORKFLOW AREA
    ],
  },
});
