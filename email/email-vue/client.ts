import { createSafClient } from "@saflib/sdk";
import type { paths } from "@saflib/email-spec";

let client: ReturnType<typeof createSafClient<paths>> | null = null;

/** Shared openapi-fetch client for the product API host (`api`). */
export const getClient = () => {
  if (!client) {
    client = createSafClient<paths>("api");
  }
  return client;
};
