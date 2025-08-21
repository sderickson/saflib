import type { paths } from "@saflib/identity-spec";
import { createSafClient, TanstackError } from "@saflib/vue-spa";

export const client = createSafClient<paths>("identity");

declare module "@tanstack/vue-query" {
  interface Register {
    defaultError: TanstackError;
  }
}
