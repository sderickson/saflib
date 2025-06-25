export { AsyncPage } from "./tricky-imports.ts";
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
  callback?: (app: ReturnType<typeof createApp>) => void;
}

export const createVueApp = (
  Application: Component,
  { router, vuetifyConfig, callback }: CreateVueAppOptions,
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

  if (callback) {
    callback(app);
  }

  app.mount("#app");
  return createApp(app);
};
