/**
 * Tanstack Query utilities for Vue.
 * @module @saflib/sdk
 */

import { QueryClient } from "@tanstack/vue-query";
import createClient from "openapi-fetch";
import { isTestEnv } from "./wip-env.ts";
import { getProtocol, getHost } from "@saflib/vue";

export { isTestEnv };

// Components
export { default as AddressForm } from "./components/address-form/AddressForm.vue";
export { address_form_strings } from "./components/address-form/AddressForm.strings.ts";

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
 * Error returned by `handleClientMethod` so that Tanstack errors are always instances of this class.
 */
export class TanstackError extends Error {
  status: number;
  code: string | undefined;
  constructor(status: number, code?: string) {
    super("Network error caught by Tanstack");
    this.status = status;
    this.code = code;
  }
}

/**
 * Returns a human-readable error message based on the TanstackError status code.
 */
export function getTanstackErrorMessage(
  error: TanstackError | undefined,
): string {
  if (!error) return "";
  switch (error.status) {
    case 400:
      return "Bad Request - The request was invalid or malformed";
    case 401:
      return "Unauthorized - Authentication is required";
    case 403:
      return "Forbidden - You don't have permission to access this resource";
    case 404:
      return "Not Found - The requested resource was not found";
    case 409:
      return "Conflict - The request conflicts with the current state of the resource";
    case 429:
      return "Too Many Requests - Rate limit exceeded, please try again later";
    default:
      if (error.status >= 500) {
        return "Server Error - Something went wrong on our end, please try again later";
      }
      return "Unknown Error - An unexpected error occurred";
  }
}

/**
 * Interface for the successful response from the client that handleClientMethod expects.
 */
export interface ClientResponse {
  status: number;
}

/**
 * Interface for the error from the client that handleClientMethod expects.
 */
export interface ClientResponseError {
  code?: string;
}

/**
 * Interface for the result from the client that handleClientMethod expects.
 */
export interface ClientResult<T> {
  error?: ClientResponseError;
  data?: T;
  response: ClientResponse;
}

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
