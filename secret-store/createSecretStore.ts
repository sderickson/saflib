import type { SecretStore } from "./SecretStore.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";

export type CreateSecretStoreOptions = { type: "env" };

/**
 * Creates an env-backed {@link SecretStore}.
 * For Infisical, use `@saflib/vendors-infisical`.
 */
export function createSecretStore(
  options: CreateSecretStoreOptions,
): SecretStore {
  switch (options.type) {
    case "env":
      return new EnvSecretStore();
    default: {
      const _: never = options;
      return _;
    }
  }
}
