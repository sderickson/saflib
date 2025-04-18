import createClient from "openapi-fetch";
import type { FetchResponse } from "openapi-fetch";

export const createSafClient = <Q extends {}>(
  subdomain: string,
): ReturnType<typeof createClient<Q>> => {
  return createClient<Q>({
    baseUrl: `${document.location.protocol}//${subdomain}.${document.location.host}`,
    credentials: "include",
    fetch: (request: Request) => {
      // this is little noop wrapper is required for msw to work
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("_csrf_token="))
        ?.split("=")[1];
      if (csrfToken) {
        request.headers.set("X-CSRF-Token", csrfToken);
      }
      return fetch(request);
    },
  });
};

export class TanstackError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, code?: string) {
    super("Network error caught by Tanstack");
    this.status = status;
    this.code = code;
  }
}

export const handleClientMethod = async <
  T extends FetchResponse<any, any, any>,
>(
  request: Promise<T>,
) => {
  const result = await request;
  if (result.error !== undefined) {
    // Note: The error message is logged for development, but not propagated to the UI.
    // This is because UI should not render the untranslated error message, but instead
    // give the user a message based on the HTTP status or, if that's not sufficient,
    // the error code.
    console.error("Network error:", result.error);
    throw new TanstackError(result.response.status, result.error.code);
  }
  return result.data;
};

import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import { VueQueryPlugin } from "@tanstack/vue-query";
import type { Router } from "vue-router";

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
  app.use(VueQueryPlugin, { enableDevtoolsV6Plugin: true });
  app.mount("#app");
  return createApp(app);
};
