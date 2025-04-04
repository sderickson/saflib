import createClient from "openapi-fetch";
import type { paths } from "@saflib/auth-spec";
export const baseUrl = `${document.location.protocol}//api.${document.location.host}`;
export const client = createClient<paths>({
  fetch: (request: Request) => {
    // TODO: refactor in csrf middleware
    // this is little noop wrapper is required for msw to work
    // const csrfToken = request.headers.get("x-csrf-token");
    // if (csrfToken) {
    //   request.headers.set("x-csrf-token", csrfToken);
    // }
    return fetch(request);
  },
  baseUrl,
  credentials: "include",
});
