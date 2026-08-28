import { createSpaMain } from "@saflib/vue";
import Spa from "./AuthSpa.vue";
import "vuetify/styles";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { createAuthRouter } from "./router.ts";
import { auth_strings } from "./strings.ts";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "auth",
  title: "Base Auth",
  spa: Spa,
  createRouter: createAuthRouter,
  strings: auth_strings,
  callback: createSentryCallback({ source: "auth" }),
  vuetifyConfig,
});
