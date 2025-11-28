import { createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import App from "./__SubdomainName__App.vue";
import { create__SubdomainName__Router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";

export const main = () => {
  setClientName("__subdomain-name__");
  const router = create__SubdomainName__Router();
  createVueApp(App, {
    router,
    i18nMessages: {
      ...__subdomain_name___strings,
    },
  });
};
