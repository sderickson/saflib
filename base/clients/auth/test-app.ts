import { createSpaTestHelpers } from "@saflib/vue/testing";
import { createAuthRouter } from "./router.ts";
import { auth_strings } from "./strings.ts";

export const { createTestRouter, mountTestApp } = createSpaTestHelpers({
  createRouter: createAuthRouter,
  strings: auth_strings,
});
