# Overview

This library provides workflows and templates for wrapping third-party APIs into integration packages. Each integration package exposes a scoped, mockable client and a test call to verify connectivity.

## Package Structure

Each integration package should have the following structure:

```
{integration-name}/
├── .gitignore
├── bin/
│   ├── ping.ts             # Runs the ping call with a live API key
│   └── {call-name}.ts      # Runs a call with a live API key
├── calls/
│   ├── ping.ts             # Read-only API call to verify connectivity
│   ├── {call-name}.ts      # Product-specific call implementation
│   └── {call-name}.mocks.ts  # Mock for the call
├── client.ts               # Scoped client with mock/real branching
├── client.mocks.ts         # Mock data and mock client implementation
├── secrets.json            # Declared secret names (API keys, etc.)
├── env.ts                  # Generated typed env (NODE_ENV via @saflib/env; no local schema by default)
├── index.ts
├── index.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.js
```

## Runtime Behavior: API Key and Mock Logic

Credentials live in the secret store (declared in `secrets.json`). **Do not put API keys in env.** The stub ships a generated `env.ts` (extends `@saflib/env` for `NODE_ENV`, etc.) with no local `env.schema.json`. Add a schema only for non-secret knobs, then re-run `saf-env generate`.

```ts
import { typedEnv } from "./env.ts";
import packageSecrets from "./secrets.json" with { type: "json" };

const isTest = typedEnv.NODE_ENV === "test";
let _isMocked = isTest;
let _configured = isTest;
let apiKey: string | undefined;

export async function configureMyIntegration(store: SecretStore): Promise<void> {
  if (_configured) return;
  const result = await store.getSecretByName("MY_API_KEY", packageSecrets);
  if (result.result !== undefined) {
    apiKey = result.result;
    _isMocked = apiKey === "mock";
  }
  _configured = true;
}
```

### Why this matters

| Scenario                  | `apiKey`      | `isTest` | Behavior                                     |
| ------------------------- | ------------- | -------- | -------------------------------------------- |
| Unit tests (`vitest run`) | `undefined`   | `true`   | Skip configure fetch, `isMocked = true`      |
| Dev with secret set       | `"sk-abc..."` | `false`  | `isMocked = false` → real client             |
| Dev forgot secret         | `undefined`   | `false`  | Warn on configure; real client may throw     |
| CI with `MY_API_KEY=mock` | `"mock"`      | `false`  | `isMocked = true` → mock client              |

Use the `"mock"` sentinel (via the env-backed secret store or Infisical) to opt into mocks outside tests.

## Scoping the Client

Integration clients should expose only the SDK methods the application actually uses. This keeps mock implementations small and limits how tightly the app couples to a specific SDK.

### Flat SDKs

When the SDK client has top-level methods, use `Pick` directly:

```ts
import Stripe from "stripe";

const sdk = new Stripe(apiKey);
export type ScopedStripeClient = Pick<Stripe, "customers" | "charges">;
```

### Nested SDKs

Some SDKs group methods under namespaces (e.g. `sdk.search.getPhotos`). In this case, define the scoped type by picking from each namespace:

```ts
import { createApi } from "unsplash-js";

type UnsplashApi = ReturnType<typeof createApi>;
export type ScopedUnsplashClient = {
  search: Pick<UnsplashApi["search"], "getPhotos">;
  photos: Pick<UnsplashApi["photos"], "get" | "trackDownload">;
};
```

### When `Pick` doesn't fit

Some SDKs use factory functions or return deeply nested objects where `Pick` is awkward. In that case, define a small interface manually and cast the SDK to it:

```ts
export type ScopedMyClient = {
  listItems: (params: { limit: number }) => Promise<Item[]>;
};

const sdk = createMyClient({ apiKey });
myClient = sdk as unknown as ScopedMyClient;
```

The goal is always the same: the scoped type is the contract that the mock must satisfy and the application must not exceed.

## Mock Implementation

Mock data and mock client construction live in `client.mocks.ts`, separate from the client logic in `client.ts`. This keeps `client.ts` focused on the type definition, gate logic, and branching, while the mock file holds all placeholder data and method implementations.

`client.mocks.ts` exports the mock client, which `client.ts` imports and uses when `isMocked` is true.

The mock client must satisfy the scoped type and return realistic placeholder data. Mocks are used in two situations:

1. **Unit tests** — `vitest run` sets `NODE_ENV=test`, so the mock is used automatically.
2. **CI or environments without a real key** — Setting the secret to `"mock"` explicitly opts in to mock mode.

Keep mock responses minimal but structurally correct — the test suite (and any downstream code exercised by tests) needs the response shape to be accurate.

## Calls

Calls are the product-facing layer of an integration. While the scoped client exposes raw SDK methods, calls wrap those methods with product-specific logic: parameter building, response parsing, validation, retries, caching, etc.

### Structure

Each call has three files:

```
calls/
├── parse-file.ts         # Implementation
├── parse-file.mocks.ts   # Mock for tests
bin/
└── parse-file.ts         # Manual test script
```

Use `npm exec saf-workflow kickoff integrations/add-call ./calls/<name>.ts` to scaffold these.

### Call implementation (`calls/<name>.ts`)

A call imports the scoped client and `isMocked` from `../client.ts`, and the mock from the adjacent `.mocks.ts` file. It should:

- Define a typed result interface.
- Return the mock early when `isMocked` is true.
- Use the scoped client (not the raw SDK) for the real implementation.
- Be exported from `index.ts`.

```ts
import { myIntegration, isMocked } from "../client.ts";
import { mockParseFile } from "./parse-file.mocks.ts";

export interface ParseFileResult<T = unknown> {
  data: T;
  explanation: string;
}

export async function parseFile<T>(
  stream: ReadableStream,
  schema: object,
): Promise<ParseFileResult<T>> {
  if (isMocked) {
    return mockParseFile();
  }
  // ... real implementation using myIntegration
}
```

### Call mocks (`calls/<name>.mocks.ts`)

The mock file exports a function returning realistic placeholder data that matches the call's result type. Keeping mocks in separate files:

- Prevents `client.ts` and call files from growing large with inline mock data.
- Makes it easy to find and update mock responses.
- Keeps the real implementation readable.

### Bin scripts (`bin/<name>.ts`)

Each call should have a corresponding bin script for manual testing with a live API key:

```ts
import { parseFile } from "../calls/parse-file.ts";

const result = await parseFile(stream, schema);
console.log(JSON.stringify(result, null, 2));
```

Add an npm script: `"parse-file": "node --env-file=.env --experimental-strip-types ./bin/parse-file.ts"`

### Test call (`calls/ping.ts`)

Every integration includes a `ping.ts` call created by the init workflow. This is a minimal read-only call to verify connectivity. It:

- Calls a safe method (list, get, search — never create, update, or delete).
- Has a corresponding `bin/ping.ts` and `npm run ping` for manual verification.

To test the integration manually:

1. Add your API key to `.env`.
2. Run `npm run ping`.
