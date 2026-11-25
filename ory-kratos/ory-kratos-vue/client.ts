import { createSafClient } from "@saflib/sdk";
import type { paths } from "@saflib/ory-kratos-spec";

let apiSubdomain = "api";
let client: ReturnType<typeof createSafClient<paths>> | null = null;

/** Point identity lookups at the product's API host (default `api`). */
export function configureOryKratosVue(options: { apiSubdomain: string }) {
  apiSubdomain = options.apiSubdomain;
  client = null;
}

export const getClient = () => {
  if (!client) {
    client = createSafClient<paths>(apiSubdomain);
  }
  return client;
};
