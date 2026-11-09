import { createSafClient } from "@saflib/sdk";
import type { paths } from "@saflib/ops-spec";

let apiSubdomain = "api";
let client: ReturnType<typeof createSafClient<paths>> | null = null;

/**
 * Point the ops pages at the product's API host. Defaults to `api`
 * (`api.<domain>`); products whose API lives elsewhere (e.g. the hub, at
 * `hub.<domain>`) call this once at startup, before any page renders.
 */
export function configureOpsVue(options: { apiSubdomain: string }) {
  apiSubdomain = options.apiSubdomain;
  client = null;
}

/** Shared openapi-fetch client for the product API host. */
export const getClient = () => {
  if (!client) {
    client = createSafClient<paths>(apiSubdomain);
  }
  return client;
};
