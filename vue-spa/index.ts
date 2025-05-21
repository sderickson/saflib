import AsyncPage from "./AsyncPage.vue";
export { AsyncPage };
import { createTanstackQueryClient } from "./tanstack.ts";
import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import type { Router } from "vue-router";
export * from "./tanstack.ts";

interface CreateVueAppOptions {
  router: Router;
  vuetifyConfig?: VuetifyOptions;
}

export const createVueApp = (
  Application: Component,
  { router, vuetifyConfig }: CreateVueAppOptions,
) => {
  const vuetify = createVuetify(vuetifyConfig);
  const app = createApp(Application);
  app.use(vuetify);
  if (router) {
    app.use(router);
  }

  const queryClient = createTanstackQueryClient();
  const options: VueQueryPluginOptions = {
    enableDevtoolsV6Plugin: true,
    queryClient,
  };
  app.use(VueQueryPlugin, options);
  app.mount("#app");
  return createApp(app);
};
