// TODO: Import the SDK client package.
// Example: import Anthropic from "@anthropic-ai/sdk";
import { typedEnv } from "./env.ts";

// TODO: Replace __INTEGRATION_NAME___API_KEY with the actual env variable name
// you added to env.schema.json, and update the error message accordingly.
const apiKey = typedEnv.__INTEGRATION_NAME___API_KEY;
const isTest = typedEnv.NODE_ENV === "test";
if (!apiKey && !isTest) {
  throw new Error(
    "__INTEGRATION_NAME___API_KEY is required. Set it in your environment or .env file.",
  );
}
export const isMocked = apiKey === "mock" || isTest;

// TODO: Define the scoped client type — the subset of the SDK that this
// integration exposes. Keeping the surface small makes mocks easy to maintain.
// Example:
//   export type Scoped__IntegrationName__Client = {
//     messages: { create: (body: CreateParams) => Promise<Message> };
//   };
export type Scoped__IntegrationName__Client = Record<string, never>;

// TODO: Implement a mock client returning realistic placeholder data.
const mock__IntegrationName__Client: Scoped__IntegrationName__Client = {};

let __integrationName__Client: Scoped__IntegrationName__Client;

if (isMocked) {
  __integrationName__Client = mock__IntegrationName__Client;
} else {
  // TODO: Initialise the real SDK client and map it to the scoped interface.
  // Example:
  //   const sdk = new Anthropic({ apiKey });
  //   __integrationName__Client = {
  //     messages: sdk.messages as Scoped__IntegrationName__Client["messages"],
  //   };
  __integrationName__Client = mock__IntegrationName__Client;
}

export const __integrationName__ = __integrationName__Client;
