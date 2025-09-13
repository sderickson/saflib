import type { paths } from "@saflib/identity-spec";
import type { paths as emailPaths } from "@saflib/email-spec";
import { createSafClient, TanstackError } from "@saflib/sdk";

let client: ReturnType<typeof createSafClient<paths>> | null = null;
let emailClient: ReturnType<typeof createSafClient<emailPaths>> | null = null;

export const getClient = () => {
  if (!client) {
    client = createSafClient<paths>("identity");
  }
  return client;
};
export const getEmailClient = () => {
  if (!emailClient) {
    emailClient = createSafClient<emailPaths>("identity");
  }
  return emailClient;
};

declare module "@tanstack/vue-query" {
  interface Register {
    defaultError: TanstackError;
  }
}
