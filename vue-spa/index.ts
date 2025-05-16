import createClient from "openapi-fetch";
import AsyncPage from "./AsyncPage.vue";
export { AsyncPage };

export const createSafClient = <Q extends {}>(
  subdomain: string,
): ReturnType<typeof createClient<Q>> => {
  return createClient<Q>({
    baseUrl: `${document.location.protocol}//${subdomain}.${document.location.host}`,
    credentials: "include",
    fetch: (request) => {
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

interface ClientResponse {
  status: number;
}

interface ClientResponseError {
  code?: string;
}

interface ClientResult<T> {
  error?: ClientResponseError;
  data?: T;
  response: ClientResponse;
}

export const handleClientMethod = async <T>(
  request: Promise<ClientResult<T>>,
): Promise<T> => {
  let result: ClientResult<T>;
  try {
    result = await request;
  } catch (e) {
    throw new TanstackError(0, "Network error");
  }
  if (result.error !== undefined) {
    // Note: The error message is logged for development, but not propagated to the UI.
    // This is because UI should not render the untranslated error message, but instead
    // give the user a message based on the HTTP status or, if that's not sufficient,
    // the error code.
    throw new TanstackError(result.response.status, result.error.code);
  }
  if (result.data === undefined) {
    throw new TanstackError(result.response.status, "No data returned");
  }
  return result.data;
};

import { createApp, type Component } from "vue";
import { createVuetify, type VuetifyOptions } from "vuetify";
import {
  QueryClient,
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
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

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 10,
        retry: (failureCount, error) => {
          if (error instanceof TanstackError) {
            switch (error.status) {
              case 401:
              case 403:
              case 404:
              case 500:
              case 0: // network error
                return false;
              default:
                return failureCount < 3;
            }
          }
          return failureCount < 3;
        },
      },
    },
  });

  const options: VueQueryPluginOptions = {
    enableDevtoolsV6Plugin: true,
    queryClient,
  };
  app.use(VueQueryPlugin, options);
  app.mount("#app");
  return createApp(app);
};
