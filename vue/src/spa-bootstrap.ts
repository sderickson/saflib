import type { Component } from "vue";
import type { Router } from "vue-router";
import type { VuetifyOptions } from "vuetify";
import { setClientName } from "@saflib/links";
import {
  createVueApp,
  type CreateVueAppOptions,
} from "./app.ts";
import { configureAppDocumentTitle } from "./document-title.ts";
import type { I18nMessages } from "./strings.ts";
import type { AsyncPageErrorComponent } from "../async-page-error.ts";

export interface CreateSpaMainOptions {
  /** Passed to {@link setClientName} (e.g. `"app"`, `"admin"`). */
  clientName: string;
  /** When set, updates `document.title` via {@link configureAppDocumentTitle}. */
  title?: string;
  spa: Component;
  createRouter: () => Router;
  strings: I18nMessages;
  asyncPageError?: AsyncPageErrorComponent;
  callback?: CreateVueAppOptions["callback"];
  vuetifyConfig?: VuetifyOptions;
  /** Runs after client name / title setup, before `createVueApp`. */
  beforeMount?: () => void;
}

/**
 * Standard SPA entry: client name → optional title → router → `createVueApp`.
 *
 * Side-effect CSS / font imports stay in the calling `main.ts`.
 */
export function createSpaMain(options: CreateSpaMainOptions): () => void {
  return () => {
    setClientName(options.clientName);
    if (options.title !== undefined) {
      configureAppDocumentTitle(options.title);
    }
    options.beforeMount?.();
    createVueApp(options.spa, {
      router: options.createRouter(),
      asyncPageError: options.asyncPageError,
      i18nMessages: options.strings,
      callback: options.callback,
      vuetifyConfig: options.vuetifyConfig,
    });
  };
}
