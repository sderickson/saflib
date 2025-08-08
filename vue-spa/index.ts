export { AsyncPage } from "./tricky-imports.ts";
export * from "./types.ts";
export { default as SpaLink } from "./SpaLink.vue";
import { createTanstackQueryClient } from "./tanstack.ts";
import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import type { Router } from "vue-router";
export * from "./tanstack.ts";
export * from "./events.ts";
import "./assets.d.ts";
import { createI18n } from "vue-i18n";
import { makeStringToKeyMap } from "./strings.ts";

type MessagesObject = Parameters<typeof createI18n>[0];

const defaultMessages: MessagesObject = {
  locale: "en",
  messages: {
    en: {
      hello: "Hello, world",
    },
  },
};

export interface I18nMessages {
  [key: string]: string | Array<I18nMessages> | I18nMessages;
}

interface CreateVueAppOptions {
  router: Router;
  vuetifyConfig?: VuetifyOptions;
  callback?: (app: ReturnType<typeof createApp>) => void;
  i18nMessages?: I18nMessages;
}

export const createVueApp = (
  Application: Component,
  { router, vuetifyConfig, callback, i18nMessages }: CreateVueAppOptions,
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

  let messages = defaultMessages;
  if (i18nMessages) {
    messages = {
      locale: "en",
      messages: {
        en: i18nMessages,
      },
    };
  }

  const i18n = createI18n(messages);
  console.log(
    "string to key map",
    JSON.stringify(makeStringToKeyMap(i18nMessages ?? {}), null, 2),
  );
  app.use(i18n);

  if (callback) {
    callback(app);
  }

  app.mount("#app");
  return createApp(app);
};

// Import this here so that typescript is okay with accessing import.meta.env
// @ts-expect-error - vite/client is not a module
import type { ImportMetaEnv as _ImportMetaEnv } from "vite/client";
export const getViteEnv = () => {
  return import.meta.env;
};
