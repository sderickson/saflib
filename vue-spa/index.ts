import createClient from "openapi-fetch";

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
