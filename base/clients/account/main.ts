import { createSpaMain } from "@saflib/vue";
import Spa from "./AccountSpa.vue";
import "@saflib/base-clients-common/style-imports";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { createAccountRouter } from "./router.ts";
import { account_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createSentryCallback } from "@saflib/base-clients-common/clients/sentry";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "account",
  title: "Base Account",
  spa: Spa,
  createRouter: createAccountRouter,
  strings: account_strings,
  asyncPageError: BaseAsyncPageError,
  callback: createSentryCallback({ source: "account" }),
  vuetifyConfig,
});
