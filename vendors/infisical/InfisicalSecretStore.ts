import { InfisicalSDK } from "@infisical/sdk";
import type { ReturnsError } from "@saflib/utils";
import { SecretStore, type SecretStoreError } from "@saflib/secret-store";
import {
  InfisicalNetworkError,
  InfisicalUnauthorizedError,
  mapSdkError,
} from "./errors.ts";
import { mockGetSecretByName } from "./mockGetSecretByName.ts";

/** Machine identity Universal Auth credentials (client id + client secret). */
export type InfisicalUniversalAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type InfisicalSecretStoreOptions = {
  projectId: string;
  environment: string;
} & (
  | {
      /**
       * Static access token (machine identity Token Auth). Pass `"mock"` to use
       * the mock behavior (env override or placeholder).
       */
      accessToken: string;
      universalAuth?: undefined;
    }
  | {
      /**
       * Universal Auth credentials. The store logs in on first fetch and logs in
       * again if the short-lived access token is rejected.
       */
      universalAuth: InfisicalUniversalAuthCredentials;
      accessToken?: undefined;
    }
);

/**
 * Resolves secrets via the Infisical API using credentials supplied by the caller.
 */
export class InfisicalSecretStore extends SecretStore {
  private readonly options: InfisicalSecretStoreOptions;
  private readonly sdk: InfisicalSDK | null;
  /** In-flight or completed Universal Auth login; shared so concurrent fetches log in once. */
  private login: Promise<void> | null = null;

  constructor(options: InfisicalSecretStoreOptions) {
    super();
    this.options = options;
    if (options.accessToken === "mock") {
      this.sdk = null;
      return;
    }
    const sdk = new InfisicalSDK();
    if (options.accessToken !== undefined) {
      sdk.auth().accessToken(options.accessToken);
    }
    this.sdk = sdk;
  }

  protected async fetchSecretByName(
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

    const first = await this.fetchOnce(this.sdk, name);
    if (
      this.options.universalAuth &&
      first.error instanceof InfisicalUnauthorizedError
    ) {
      // Access token likely expired: drop the login (unless another fetch
      // already replaced it) and retry once with a fresh one.
      if (this.login === first.login) this.login = null;
      return this.fetchOnce(this.sdk, name);
    }
    return first;
  }

  private async fetchOnce(
    sdk: InfisicalSDK,
    name: string,
  ): Promise<
    ReturnsError<string, SecretStoreError> & { login?: Promise<void> | null }
  > {
    const login = this.ensureLoggedIn(sdk);
    try {
      await login;
      const secret = await sdk.secrets().getSecret({
        projectId: this.options.projectId,
        environment: this.options.environment,
        secretName: name,
      });
      return { result: secret.secretValue, login };
    } catch (err) {
      return { error: mapSdkError(err), login };
    }
  }

  /** No-op for static tokens; for Universal Auth, logs in once and reuses the result. */
  private ensureLoggedIn(sdk: InfisicalSDK): Promise<void> | null {
    const credentials = this.options.universalAuth;
    if (!credentials) return null;
    if (!this.login) {
      const login: Promise<void> = sdk
        .auth()
        .universalAuth.login(credentials)
        .then(() => undefined)
        .catch((err: unknown) => {
          // Let the next fetch try again instead of caching the failure.
          if (this.login === login) this.login = null;
          throw err;
        });
      this.login = login;
    }
    return this.login;
  }
}

/** Convenience factory for Infisical-backed stores. */
export function createInfisicalSecretStore(
  options: InfisicalSecretStoreOptions,
): InfisicalSecretStore {
  return new InfisicalSecretStore(options);
}
