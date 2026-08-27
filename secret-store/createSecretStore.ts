import type { SecretStore } from "./SecretStore.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";

export type CreateSecretStoreOptions = { type: "env" };

/**
 * Creates an env-backed {@link SecretStore}.
 * For Infisical, use `@saflib/vendors-infisical`.
 */
export function createSecretStore(
  _options: CreateSecretStoreOptions = { type: "env" },
): SecretStore {
  return new EnvSecretStore();
}
