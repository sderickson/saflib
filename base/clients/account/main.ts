import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AccountSpa.vue";
import "vuetify/styles";
import { createAccountRouter } from "./router.ts";
import { account_strings } from "./strings.ts";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = () => {
  setClientName("account");
  configureAppDocumentTitle("Base Account");
  const router = createAccountRouter();
  createVueApp(Spa, {
    router,
    i18nMessages: {
      ...account_strings,
    },
    callback: createSentryCallback({ source: "account" }),
  });
};
