import { createSpaMain } from "@saflib/vue";
import Spa from "./AdminSpa.vue";
import "@saflib/base-clients-common/style-imports";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";
import { BaseAsyncPageError } from "@saflib/base-clients-common/components";
import { createClientErrorCallback } from "@saflib/errors-vue/lib/createClientErrorCallback.ts";
import "@saflib/base-clients-common/clients/events";

export const main = createSpaMain({
  clientName: "admin",
  title: "Base Admin",
  spa: Spa,
  createRouter: createAdminRouter,
  strings: admin_strings,
  asyncPageError: BaseAsyncPageError,
  callback: createClientErrorCallback({ source: "admin" }),
  vuetifyConfig,
});
