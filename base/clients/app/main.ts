import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AppSpa.vue";
import "vuetify/styles";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = () => {
  setClientName("app");
  configureAppDocumentTitle("Base App");
  const router = createAppRouter();
  createVueApp(Spa, {
    router,
    asyncPageError: BaseAsyncPageError,
    i18nMessages: {
      ...app_strings,
    },
    callback: createSentryCallback({ source: "app" }),
  });
};
