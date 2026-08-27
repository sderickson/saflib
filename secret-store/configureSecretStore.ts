import type { SecretStore } from "./SecretStore.ts";

let secretStore: SecretStore | undefined;

/** Whether a process-level store has been set. */
export function hasSecretStore(): boolean {
  return secretStore !== undefined;
}

/**
 * Sets the process-level secret store. Idempotent — subsequent calls are no-ops.
 * Vendor packages (e.g. `@saflib/vendors-infisical`) call this from their configure helpers.
 */
export function setSecretStore(store: SecretStore): void {
  if (secretStore) return;
  secretStore = store;
}

/** Returns the store set by {@link setSecretStore}. */
export function getSecretStore(): SecretStore {
  if (!secretStore) {
    throw new Error(
      "Secret store not initialized. Call setSecretStore() (or a vendor configure helper) first.",
    );
  }
  return secretStore;
}

/** Test-only: clear the process-level store so configure / set can run again. */
export function resetSecretStoreForTests(): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetSecretStoreForTests is only available in test");
  }
  secretStore = undefined;
}
