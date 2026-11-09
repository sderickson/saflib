import { defineConfig } from "vitest/config";
import { defaultMaxWorkers } from "./vitest/base-vitest.config.js";

export default defineConfig({
  test: {
    fsModuleCache: true,
    isolate: false,
    // Projects that don't set maxWorkers inherit this; Vitest refuses to run
    // projects with different values together, and the shared configs set it.
    maxWorkers: defaultMaxWorkers,
    env: {
      TZ: "UTC",
      NODE_OPTIONS: "--disable-warning=DEP0040",
    },

    projects: [
      // BEGIN WORKFLOW AREA test-product-dependencies FOR product/init
      "*/**/vitest.config.{ts,js,mts,mjs}",
      // Scaffold template is copied to product roots; not a runnable vitest workspace here.
      "!templates/scaffold/**",
      // Packages under tmp/ are tested by workflow-script CI / live-test.
      "!tmp/**",
      "tmp/**/vitest.config.{ts,js,mts,mjs}",
      // gRPC scaffold packages still depend on deleted template-package-* names.
      "!grpc/**/workflows/*-templates/**",
      // END WORKFLOW AREA
    ],
  },
});
