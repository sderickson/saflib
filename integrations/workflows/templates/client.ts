// TODO: Import the SDK client package.
import { typedEnv } from "./env.ts";
import { mock__IntegrationName__Client } from "./client.mocks.ts";

// TODO: Update the env variable name below if you renamed it in env.schema.json.
const apiKey = typedEnv.__INTEGRATION_NAME___API_KEY;
const isTest = typedEnv.NODE_ENV === "test";

// IMPORTANT: Do not change these two gates. See @saflib/integrations docs for rationale.
// Gate 1: Throw if key is missing outside of tests (catches misconfiguration).
if (!apiKey && !isTest) {
  throw new Error(
    "__INTEGRATION_NAME___API_KEY is required. Set it in your environment or .env file.",
  );
}
// Gate 2: Mock when key is explicitly "mock" or in tests. Missing key !== mock.
export const isMocked = apiKey === "mock" || isTest;

// TODO: Define the scoped client type. Use Pick to select only the SDK methods
// this integration needs, keeping the mock surface small.
// For flat SDKs:   Pick<SdkClient, "list" | "get">
// For nested SDKs: { ns: Pick<SdkClient["ns"], "method1" | "method2"> }
// See @saflib/integrations docs for more patterns.
export type Scoped__IntegrationName__Client = Record<string, never>;

let __integrationName__Client: Scoped__IntegrationName__Client;

if (isMocked) {
  __integrationName__Client = mock__IntegrationName__Client;
} else {
  // TODO: Initialise the real SDK client and cast it to the scoped type.
  // Example:
  //   const sdk = new SdkClient({ apiKey });
  //   __integrationName__Client = sdk as Scoped__IntegrationName__Client;
  __integrationName__Client = mock__IntegrationName__Client;
}

export const __integrationName__ = __integrationName__Client;
