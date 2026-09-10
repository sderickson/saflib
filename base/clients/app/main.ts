import { createSpaMain } from "@saflib/vue";
import Spa from "./AppSpa.vue";
import "@saflib/base-clients-common/style-imports";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createClientErrorCallback } from "@saflib/errors-vue/lib/createClientErrorCallback.ts";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "app",
  title: "Base App",
  spa: Spa,
  createRouter: createAppRouter,
  strings: app_strings,
  asyncPageError: BaseAsyncPageError,
  callback: createClientErrorCallback({ source: "app" }),
  vuetifyConfig,
});
