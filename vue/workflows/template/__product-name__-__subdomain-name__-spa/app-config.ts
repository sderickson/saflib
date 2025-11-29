import { create__SubdomainName__Router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";
import type { CreateVueAppInstanceOptions } from "@saflib/vue";

/**
 * Returns the app configuration (router and i18n messages) for this SPA.
 * This is used by both main.ts (production) and test-app.ts (testing).
 */
export const get__SubdomainName__AppConfig = (): Pick<
  CreateVueAppInstanceOptions,
  "router" | "i18nMessages"
> => {
  return {
    router: create__SubdomainName__Router(),
    i18nMessages: {
      ...__subdomain_name___strings,
    },
  };
};

