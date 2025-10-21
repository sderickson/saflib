import { createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import App from "./__SubdomainName__App.vue";
import { router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";

export const main = () => {
  setClientName("__subdomain-name__");
  createVueApp(App, {
    router,
    i18nMessages: {
      ...__subdomain_name___strings,
    },
  });
};
