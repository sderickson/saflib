import { QueryClient } from "@tanstack/vue-query";
import createClient from "openapi-fetch";
import { isTestEnv } from "@saflib/vue";
import { getProtocol, getHost } from "@saflib/links";
import { TanstackError } from "./errors.ts";
import type { ClientResult } from "./types.ts";

/**
 * Given a "paths" openapi generated type and a subdomain, creates a typed `openapi-fetch` client which queries the given subdomain. Uses the current domain and protocol. Handles CSRF token injection, and works in tests.
 */
export const createSafClient = <Q extends {}>(
  serviceSubdomain: string,
): ReturnType<typeof createClient<Q>> => {
  let protocol = "http";
  let host = "localhost:3000";
  if (typeof document !== "undefined") {
    protocol = getProtocol();
    host = getHost();
  }
  const baseUrl = `${protocol}//${serviceSubdomain}.${host}`;
  return createClient<Q>({
    baseUrl,
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

/**
 * Creates a Tanstack Query client with default timeout and retry settings. It has a staleTime of 10 seconds, so that requests made from different parts of the page during a page load don't trigger multiple requests. It also doesn't retry for status codes that are unlikely to be fixed by retrying, such as 401, 403, 404, 500, and network errors.
 */
export const createTanstackQueryClient = () => {
  return new QueryClient({
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
};

/**
 * Wrapper around an openapi-fetch client fetch method to handle errors and return the data in a way that is compatible with Tanstack Query.
 */
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
    if (isTestEnv()) {
      console.error(result.error);
    }
    throw new TanstackError(result.response.status, result.error.code);
  }
  if (result.data === undefined) {
    if (result.response.status === 204) {
      return undefined as T;
    }
    throw new TanstackError(result.response.status, "No data returned");
  }
  return result.data;
};
