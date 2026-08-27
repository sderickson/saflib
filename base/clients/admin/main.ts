import { createSpaMain } from "@saflib/vue";
import Spa from "./AdminSpa.vue";
import "vuetify/styles";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "admin",
  title: "Base Admin",
  spa: Spa,
  createRouter: createAdminRouter,
  strings: admin_strings,
  asyncPageError: BaseAsyncPageError,
  callback: createSentryCallback({ source: "admin" }),
});
