import createClient from "openapi-fetch";
import type { paths } from "@saflib/auth-spec";

export const client = createClient<paths>({
  baseUrl: `${document.location.protocol}//api.${document.location.host}`,
  credentials: "include",
});
