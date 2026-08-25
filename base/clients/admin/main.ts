import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AdminSpa.vue";
import "vuetify/styles";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = () => {
  setClientName("admin");
  configureAppDocumentTitle("Base Admin");
  const router = createAdminRouter();
  createVueApp(Spa, {
    router,
    i18nMessages: {
      ...admin_strings,
    },
    callback: createSentryCallback({ source: "admin" }),
  });
};
