import type { InfisicalClientError } from "./infisical/errors.ts";

/** Returned when `process.env[name]` is missing or blank. */
export class EnvSecretNotFoundError extends Error {
  constructor(name: string) {
    super(`Environment variable "${name}" is not set or is empty`);
    this.name = "EnvSecretNotFoundError";
  }
}

/** Returned when `getSecretByName` is called for a name not in the package `secrets.json`. */
export class SecretNotDeclaredError extends Error {
  constructor(name: string) {
    super(
      `Secret "${name}" is not declared in this package's secrets.json. Add it to the manifest before fetching.`,
    );
    this.name = "SecretNotDeclaredError";
  }
}

/** Union of errors returned by {@link SecretStore#getSecretByName}. */
export type SecretStoreError =
  | EnvSecretNotFoundError
  | SecretNotDeclaredError
  | InfisicalClientError;
