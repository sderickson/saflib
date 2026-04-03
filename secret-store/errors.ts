import type { InfisicalClientError } from "./infisical/errors.ts";

/** Returned when `process.env[name]` is missing or blank. */
export class EnvSecretNotFoundError extends Error {
  constructor(name: string) {
    super(`Environment variable "${name}" is not set or is empty`);
    this.name = "EnvSecretNotFoundError";
  }
}

/** Union of errors returned by {@link SecretStore#getSecretByName}. */
export type SecretStoreError = EnvSecretNotFoundError | InfisicalClientError;
