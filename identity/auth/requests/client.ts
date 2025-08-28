import type { paths } from "@saflib/identity-spec";
import type { paths as emailPaths } from "@saflib/email-spec";
import { createSafClient, TanstackError } from "@saflib/vue/tanstack";

export const client = createSafClient<paths>("identity");
export const emailClient = createSafClient<emailPaths>("identity");

declare module "@tanstack/vue-query" {
  interface Register {
    defaultError: TanstackError;
  }
}
