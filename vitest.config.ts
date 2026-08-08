import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      TZ: "UTC",
      NODE_OPTIONS: "--disable-warning=DEP0040",
    },

    projects: [
      // BEGIN WORKFLOW AREA test-product-dependencies FOR product/init
      "*/**/vitest.config.{ts,js,mts,mjs}",
      // Workflow templates copied into tmp/ use different relative depths than
      // their source paths under saflib; those packages are tested by workflow-script CI.
      "!cron/cron/workflows/templates/**",
      "!integrations/workflows/templates/**",
      "!vue/workflows/template/**",
      "!tmp/**",
      // END WORKFLOW AREA
    ],
  },
});
