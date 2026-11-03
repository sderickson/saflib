import { createSpaTestHelpers } from "@saflib/vue/testing";
import { create__SubdomainName__Router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";

export const { createTestRouter, mountTestApp } = createSpaTestHelpers({
  createRouter: create__SubdomainName__Router,
  strings: __subdomain_name___strings,
});
