import type { ReturnsError } from "@saflib/monorepo";
import { EnvSecretNotFoundError, type SecretStoreError } from "../errors.ts";
import { SecretStore } from "../SecretStore.ts";

/**
 * Resolves secrets from `process.env` by variable name.
 */
export class EnvSecretStore extends SecretStore {
  async getSecretByName(
    name: string,
  ): Promise<ReturnsError<string, SecretStoreError>> {
    const raw =
      typeof process !== "undefined" && process.env
        ? process.env[name]
        : undefined;
    if (typeof raw !== "string" || raw.trim() === "") {
      return { error: new EnvSecretNotFoundError(name) };
    }
    return { result: raw.trim() };
  }
}
