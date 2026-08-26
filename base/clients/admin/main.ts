import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AdminSpa.vue";
import "vuetify/styles";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = () => {
  setClientName("admin");
  configureAppDocumentTitle("Base Admin");
  const router = createAdminRouter();
  createVueApp(Spa, {
    router,
    asyncPageError: BaseAsyncPageError,
    i18nMessages: {
      ...admin_strings,
    },
    callback: createSentryCallback({ source: "admin" }),
  });
};
