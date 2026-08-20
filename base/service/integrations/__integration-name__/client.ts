// TODO: Import the SDK client package.
import type { SecretStore } from "@saflib/secret-store";
import { typedEnv } from "./env.ts";
import { mock__IntegrationName__Client } from "./client.mocks.ts";

const isTest = typedEnv.NODE_ENV === "test";
let _isMocked = isTest;
let _configured = isTest;

// TODO: Update the env variable name below if you renamed it in env.schema.json.
let apiKey: string | undefined;

/** True when using mocks (test mode or API key is "mock"). */
export function isMocked(): boolean {
  return _isMocked;
}

/**
 * Initializes the integration client by fetching the API key from the given
 * secret store. Idempotent — subsequent calls are no-ops.
 *
 * Call this from your service's `initializeDependencies()` function.
 */
export async function configure__IntegrationName__(
  store: SecretStore,
): Promise<void> {
  if (_configured) return;

  const result = await store.getSecretByName("__INTEGRATION_NAME___API_KEY");
  if (result.result !== undefined) {
    apiKey = result.result;
    _isMocked = apiKey === "mock";
  } else {
    console.warn(
      "[__IntegrationName__] __INTEGRATION_NAME___API_KEY not found in secret store:",
      result.error?.message,
    );
  }
  _configured = true;
}

// TODO: Define the scoped client type. Use Pick to select only the SDK methods
// this integration needs, keeping the mock surface small.
// For flat SDKs:   Pick<SdkClient, "list" | "get">
// For nested SDKs: { ns: Pick<SdkClient["ns"], "method1" | "method2"> }
// See @saflib/integrations docs for more patterns.
export type Scoped__IntegrationName__Client = Record<string, never>;

/**
 * Returns the scoped integration client. When mocked (test mode or key is
 * "mock"), returns the mock client. When not configured, throws.
 */
export function get__IntegrationName__Client(): Scoped__IntegrationName__Client {
  if (_isMocked) {
    return mock__IntegrationName__Client;
  }
  if (!_configured) {
    throw new Error(
      "__IntegrationName__ client not configured. Call configure__IntegrationName__() first.",
    );
  }
  // TODO: Initialise the real SDK client and cast it to the scoped type.
  // Example:
  //   const sdk = new SdkClient({ apiKey });
  //   return sdk as Scoped__IntegrationName__Client;
  return mock__IntegrationName__Client;
}
