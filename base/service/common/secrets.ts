import { createSecretStore, type SecretStore } from "@saflib/secret-store";
// import { configureSecretStore as configureInfisicalSecretStore } from "@saflib/vendors-infisical";

let secretStore: SecretStore | undefined;

/**
 * Initializes the shared secret store. Idempotent — subsequent calls are no-ops.
 * Must be called before {@link getSecretStore}.
 *
 * By default uses an env-backed store. Switch to Infisical when ready:
 *
 * ```ts
 * import { configureSecretStore as configureInfisicalSecretStore, getSecretStore } from "@saflib/vendors-infisical";
 * // or call configureInfisicalSecretStore() which sets the process-level store
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
