import { createSpaTestHelpers } from "@saflib/vue/testing";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";

export const { createTestRouter, mountTestApp } = createSpaTestHelpers({
  createRouter: createAppRouter,
  strings: app_strings,
});
