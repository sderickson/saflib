import type { SecretStore } from "./SecretStore.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";
import {
  InfisicalSecretStore,
  type InfisicalSecretStoreOptions,
} from "./infisical/InfisicalSecretStore.ts";

export type CreateSecretStoreOptions =
  | { type: "env" }
  | { type: "infisical"; options: InfisicalSecretStoreOptions };

/**
 * Creates a {@link SecretStore} for either plain environment variables or Infisical.
 */
export function createSecretStore(
  options: CreateSecretStoreOptions,
): SecretStore {
  switch (options.type) {
    case "env":
      return new EnvSecretStore();
    case "infisical":
      return new InfisicalSecretStore(options.options);
    default: {
      const _: never = options;
      return _;
    }
  }
}
