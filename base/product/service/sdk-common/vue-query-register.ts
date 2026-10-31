import type { TanstackError } from "@saflib/sdk";

declare module "@tanstack/vue-query" {
  interface Register {
    defaultError: TanstackError;
  }
}
