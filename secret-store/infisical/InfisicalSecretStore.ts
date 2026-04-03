import { InfisicalSDK } from "@infisical/sdk";
import type { ReturnsError } from "@saflib/monorepo";
import { SecretStore } from "../SecretStore.ts";
import type { SecretStoreError } from "../errors.ts";
import { InfisicalNetworkError, mapSdkError } from "./errors.ts";
import { mockGetSecretByName } from "./mockGetSecretByName.ts";

export type InfisicalSecretStoreOptions = {
  /**
   * Infisical project or universal auth token. Pass `"mock"` to use the same
   * mock behavior as the recipes Infisical integration (env override or placeholder).
   */
  accessToken: string;
  projectId: string;
  environment: string;
};

/**
 * Resolves secrets via the Infisical API using credentials supplied by the caller.
 */
export class InfisicalSecretStore extends SecretStore {
  private readonly options: InfisicalSecretStoreOptions;
  private readonly sdk: InfisicalSDK | null;

  constructor(options: InfisicalSecretStoreOptions) {
    super();
    this.options = options;
    if (options.accessToken === "mock") {
      this.sdk = null;
      return;
    }
    const sdk = new InfisicalSDK();
    sdk.auth().accessToken(options.accessToken);
    this.sdk = sdk;
  }

  async getSecretByName(
    name: string,
  ): Promise<ReturnsError<string, SecretStoreError>> {
    if (this.sdk === null) {
      return mockGetSecretByName(name);
    }

    const { projectId, environment } = this.options;
    if (!projectId || !environment) {
      return {
        error: new InfisicalNetworkError(
          "projectId and environment are required for InfisicalSecretStore.",
        ),
      };
    }

    try {
      const secret = await this.sdk.secrets().getSecret({
        projectId,
        environment,
        secretName: name,
      });
      return { result: secret.secretValue };
    } catch (err) {
      return { error: mapSdkError(err) };
    }
  }
}
