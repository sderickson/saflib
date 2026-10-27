import {
  createTanstackQueryClient,
  getTanstackErrorMessage,
  TanstackError,
} from "@saflib/sdk";
import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import type { Router } from "vue-router";
import { createI18n } from "vue-i18n";
import { type I18nMessages } from "./strings.ts";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import { showError } from "./snackbar.ts";
import {
  asyncPageErrorKey,
  mfaRequiredHrefKey,
  type AsyncPageErrorComponent,
} from "../async-page-error.ts";

/**
 * Options for createVueApp.
 */
export interface CreateVueAppOptions {
  router?: Router;
  vuetifyConfig?: VuetifyOptions;
  callback?: (app: ReturnType<typeof createApp>) => void;
  i18nMessages?: I18nMessages;
  /** Replaces the default {@link AsyncPageError} in AsyncPage. */
  asyncPageError?: AsyncPageErrorComponent;
  /**
   * Where to send someone when a page load fails with `MFA_REQUIRED`.
   * The default error alert shows this as a "Set up MFA" link.
   */
  mfaRequiredHref?: string;
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
 * Mutation errors are shown in the snackbar by default.
 */
export const createVueApp = (
  Application: Component,
  {
    router,
    vuetifyConfig,
    callback,
    i18nMessages,
    asyncPageError,
    mfaRequiredHref,
  }: CreateVueAppOptions = {},
) => {
  const vuetify = createVuetify(vuetifyConfig ?? defaultVuetifyConfig);
  const app = createApp(Application);
  app.use(vuetify);
  if (router) {
    app.use(router);
  }
  if (asyncPageError) {
    app.provide(asyncPageErrorKey, asyncPageError);
  }
  if (mfaRequiredHref) {
    app.provide(mfaRequiredHrefKey, mfaRequiredHref);
  }

  // Every failed mutation shows in the snackbar (`SnackbarQueue` in the layout)
  // unless it opts out with `meta: { [SILENCE_ERROR_SNACKBAR]: true }`.
  const queryClient = createTanstackQueryClient({
    onMutationError: (error) => showError(getMutationErrorMessage(error)),
  });
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

  // Vite DEV only — Vue DevTools tab for monolith Winston ring buffer.
  if (import.meta.env.DEV) {
    void import("./dev-logs-devtools.ts").then(({ registerDevLogsDevtoolsTab }) => {
      registerDevLogsDevtoolsTab();
    });
  }

  app.mount("#app");
  return app;
};

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof TanstackError) return getTanstackErrorMessage(error);
  return "Unknown Error - An unexpected error occurred";
}
