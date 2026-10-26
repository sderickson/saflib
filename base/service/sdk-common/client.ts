import { createSafClient } from "@saflib/sdk";
import "./vue-query-register.ts";

/**
 * A lazily created API client typed by one spec's `paths`. Each SDK package
 * (the product's and every offshoot's) makes its own from its own spec:
 *
 * ```ts
 * export const getClient = createApiClient<paths>();
 * ```
 *
 * Shared client concerns (tenant headers, auth refresh) go here, so every SDK
 * gets them without importing another SDK.
 */
export function createApiClient<Paths extends {}>(): () => ReturnType<
  typeof createSafClient<Paths>
> {
  let client: ReturnType<typeof createSafClient<Paths>> | null = null;
  return () => {
    if (!client) {
      client = createSafClient<Paths>("api");
    }
    return client;
  };
}
