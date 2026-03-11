// TODO: Import the SDK client package.
import { typedEnv } from "./env.ts";

// TODO: Update the env variable name below if you renamed it in env.schema.json.
const apiKey = typedEnv.__INTEGRATION_NAME___API_KEY;
const isTest = typedEnv.NODE_ENV === "test";
if (!apiKey && !isTest) {
  throw new Error(
    "__INTEGRATION_NAME___API_KEY is required. Set it in your environment or .env file.",
  );
}
export const isMocked = apiKey === "mock" || isTest;

// TODO: Define the scoped client type using Pick to select only the SDK methods
// this integration needs. This keeps the mock surface small.
// Example:
//   export type Scoped__IntegrationName__Client = Pick<SdkClient, "list" | "get">;
export type Scoped__IntegrationName__Client = Record<string, never>;

// TODO: Implement a mock client returning realistic placeholder data.
const mock__IntegrationName__Client: Scoped__IntegrationName__Client = {};

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
