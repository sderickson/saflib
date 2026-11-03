import { createSpaMain } from "@saflib/vue";
import Spa from "./__SubdomainName__Spa.vue";
import "@saflib/base-clients-common/style-imports";
import { create__SubdomainName__Router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";

export const main = createSpaMain({
  clientName: "__subdomain-name__",
  title: "__ProductName__ __SubdomainName__",
  spa: Spa,
  createRouter: create__SubdomainName__Router,
  strings: __subdomain_name___strings,
});
