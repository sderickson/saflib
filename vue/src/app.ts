import { createTanstackQueryClient } from "@saflib/sdk";
import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import type { Router } from "vue-router";
import { createI18n } from "vue-i18n";
import { type I18nMessages } from "./strings.ts";
import { aliases, mdi } from "vuetify/iconsets/mdi";

/**
 * Options for createVueApp.
 */
export interface CreateVueAppOptions {
  router?: Router;
  vuetifyConfig?: VuetifyOptions;
  callback?: (app: ReturnType<typeof createApp>) => void;
  i18nMessages?: I18nMessages;
}

const defaultVuetifyConfig: VuetifyOptions = {
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
};

/**
 * Wrapper around vue's `createApp` function. Handles SAF-required plugins.
 *
 * Sets up:
 * - Vuetify
 * - Vue Router
 * - Tanstack Query
 * - Vue I18n
 *
 */
export const createVueApp = (
  Application: Component,
  { router, vuetifyConfig, callback, i18nMessages }: CreateVueAppOptions = {},
) => {
  const vuetify = createVuetify(vuetifyConfig ?? defaultVuetifyConfig);
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

  let messages = {};
  if (i18nMessages) {
    messages = {
      legacy: false, // can be removed after vue-i18n v12 or so
      locale: "en",
      messages: {
        en: i18nMessages,
      },
    };
  }

  const i18n = createI18n(messages);
  app.use(i18n);

  if (callback) {
    callback(app);
  }
  console.log("app.mount", "#app");

  app.mount("#app");
  return app;
};
