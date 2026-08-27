import { createSpaTestHelpers } from "@saflib/vue/testing";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";

export const { createTestRouter, mountTestApp } = createSpaTestHelpers({
  createRouter: createAdminRouter,
  strings: admin_strings,
});
