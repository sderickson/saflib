import createClient from "openapi-fetch";
import type { paths } from "@saflib/auth-spec";
export const baseUrl = `${document.location.protocol}//api.${document.location.host}`;
export const client = createClient<paths>({
  fetch: (url) => {
    // this is little noop wrapper is required for msw to work
    return fetch(url);
  },
  baseUrl,
  credentials: "include",
});
