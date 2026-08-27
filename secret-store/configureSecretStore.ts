import { createSecretStore } from "./createSecretStore.ts";
import type { SecretStore } from "./SecretStore.ts";
import { typedEnv } from "./env.ts";

let secretStore: SecretStore | undefined;

/**
 * Initializes the process-level secret store from Infisical env
 * (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`).
 * Idempotent — subsequent calls are no-ops.
 */
export function configureSecretStore(): void {
  if (secretStore) return;
  secretStore = createSecretStore({
    type: "infisical",
    options: {
      accessToken: typedEnv.INFISICAL_TOKEN ?? "",
      projectId: typedEnv.INFISICAL_PROJECT_ID ?? "",
      environment: typedEnv.INFISICAL_ENVIRONMENT ?? "",
    },
  });
}

/** Returns the store configured by {@link configureSecretStore}. */
export function getSecretStore(): SecretStore {
  if (!secretStore) {
    throw new Error(
      "Secret store not initialized. Call configureSecretStore() first.",
    );
  }
  return secretStore;
}

/** Test-only: clear the process-level store so configure can run again. */
export function resetSecretStoreForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetSecretStoreForTests is only available in test");
  }
  secretStore = undefined;
}
