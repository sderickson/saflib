import { createTanstackQueryClient } from "@saflib/sdk";
import { createApp, type Component, type App } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import type { Router } from "vue-router";
import { createI18n, type I18n } from "vue-i18n";
import { type I18nMessages } from "./strings.ts";
import { aliases, mdi } from "vuetify/iconsets/mdi";

/**
 * Options for creating a Vue app instance.
 */
export interface CreateVueAppInstanceOptions {
  router?: Router;
  vuetifyConfig?: VuetifyOptions;
  i18nMessages?: I18nMessages;
}

/**
 * Result of creating a Vue app instance with plugins.
 */
export interface VueAppInstance {
  app: App;
  vuetify: ReturnType<typeof createVuetify>;
  router?: Router;
  queryClient: ReturnType<typeof createTanstackQueryClient>;
  i18n: I18n;
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
 * Creates a configured Vue app instance with all SAF-required plugins.
 * Does not mount the app. Use this for both production and testing.
 *
 * Sets up:
 * - Vuetify
 * - Vue Router
 * - Tanstack Query
 * - Vue I18n
 */
export const createVueAppInstance = (
  Application: Component,
  { router, vuetifyConfig, i18nMessages }: CreateVueAppInstanceOptions = {},
): VueAppInstance => {
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
      legacy: false,
      locale: "en",
      messages: {
        en: i18nMessages,
      },
    };
  }

  const i18n = createI18n(messages);
  app.use(i18n);

  return {
    app,
    vuetify,
    router,
    queryClient,
    i18n,
  };
};

/**
 * Options for createVueApp.
 */
export interface CreateVueAppOptions extends CreateVueAppInstanceOptions {
  callback?: (app: ReturnType<typeof createApp>) => void;
}

/**
 * Wrapper around vue's `createApp` function. Handles SAF-required plugins.
 *
 * Sets up:
 * - Vuetify
 * - Vue Router
 * - Tanstack Query
 * - Vue I18n
 *
 * Then mounts the app to #app.
 */
export const createVueApp = (
  Application: Component,
  { callback, ...options }: CreateVueAppOptions = {},
) => {
  const instance = createVueAppInstance(Application, options);

  if (callback) {
    callback(instance.app);
  }

  instance.app.mount("#app");
  return instance.app;
};
