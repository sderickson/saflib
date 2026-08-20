import { createSecretStore, type SecretStore } from "@saflib/secret-store";
// import { typedEnv } from "./env.ts";

let secretStore: SecretStore | undefined;

/**
 * Initializes the shared secret store. Idempotent — subsequent calls are no-ops.
 * Must be called before {@link getSecretStore}.
 *
 * By default uses an env-backed store. Switch to "infisical" when ready:
 *
 * ```ts
 * secretStore = createSecretStore({
 *   type: "infisical",
 *   options: {
 *     accessToken: typedEnv.INFISICAL_TOKEN ?? "",
 *     projectId: typedEnv.INFISICAL_PROJECT_ID ?? "",
 *     environment: typedEnv.INFISICAL_ENVIRONMENT ?? "",
 *   },
 * });
 * ```
 */
export function configureSecretStore(): void {
  if (secretStore) return;
  secretStore = createSecretStore({ type: "env" });
}

export function getSecretStore(): SecretStore {
  if (!secretStore) {
    throw new Error(
      "Secret store not initialized. Call configureSecretStore() first.",
    );
  }
  return secretStore;
}
