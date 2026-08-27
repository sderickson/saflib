import { createSpaTestHelpers } from "@saflib/vue/testing";
import { createAccountRouter } from "./router.ts";
import { account_strings } from "./strings.ts";

export const { createTestRouter, mountTestApp } = createSpaTestHelpers({
  createRouter: createAccountRouter,
  strings: account_strings,
});
