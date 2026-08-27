import { createSpaMain } from "@saflib/vue";
import Spa from "./AppSpa.vue";
import "vuetify/styles";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "app",
  title: "Base App",
  spa: Spa,
  createRouter: createAppRouter,
  strings: app_strings,
  asyncPageError: BaseAsyncPageError,
  callback: createSentryCallback({ source: "app" }),
});
