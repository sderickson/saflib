import { createVueApp, configureAppDocumentTitle } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import type { VuetifyOptions } from "vuetify";
import DevSiteApp from "./DevSiteApp.vue";
import "vuetify/styles";
import { createDevSiteRouter } from "./router.ts";
import { devSiteVuetifyConfig } from "./vuetify-config.ts";

export type MountDevSiteAppOptions = {
  title?: string;
  vuetifyConfig?: VuetifyOptions;
};

/** Mount the dev-site SPA shell (router + Vuetify + nav chrome). */
export function mountDevSiteApp(options: MountDevSiteAppOptions = {}): void {
  const title = options.title ?? "Dev Site";
  setClientName("dev-site");
  configureAppDocumentTitle(title);
  const router = createDevSiteRouter();
  createVueApp(DevSiteApp, {
    router,
    vuetifyConfig: options.vuetifyConfig ?? devSiteVuetifyConfig,
    callback: (app) => {
      app.provide("devSiteTitle", title);
    },
  });
}
