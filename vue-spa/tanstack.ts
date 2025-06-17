import { QueryClient } from "@tanstack/vue-query";
import createClient from "openapi-fetch";
export const createSafClient = <Q extends {}>(
  subdomain: string,
): ReturnType<typeof createClient<Q>> => {
  let protocol = "http";
  let host = "localhost:3000";
  if (typeof document !== "undefined") {
    protocol = document.location.protocol;
    host = document.location.host;
  }
  return createClient<Q>({
    baseUrl: `${protocol}//${subdomain}.${host}`,
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
    if (result.response.status === 204) {
      return undefined as T;
    }
    throw new TanstackError(result.response.status, "No data returned");
  }
  return result.data;
};

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
