import type { ReturnsError } from "@saflib/utils";
import type { SecretStoreError } from "./errors.ts";
import { SecretNotDeclaredError } from "./errors.ts";
import {
  isSecretDeclared,
  type SecretManifest,
} from "./secrets-manifest.ts";

export abstract class SecretStore {
  /**
   * Fetch a secret by name after checking it is declared in `packageSecrets`
   * (typically the package's `secrets.json`).
   */
  async getSecretByName(
    name: string,
    packageSecrets: SecretManifest,
  ): Promise<ReturnsError<string, SecretStoreError>> {
    if (!isSecretDeclared(name, packageSecrets)) {
      return { error: new SecretNotDeclaredError(name) };
    }
    return this.fetchSecretByName(name);
  }

  /** Backend-specific fetch; only called after manifest validation. */
  protected abstract fetchSecretByName(
    name: string,
  ): Promise<ReturnsError<string, SecretStoreError>>;
}
