# Overview

This library provides workflows and templates for wrapping third-party APIs into integration packages. Each integration package exposes a scoped, mockable client and a test call to verify connectivity.

## Package Structure

Each integration package should have the following structure:

```
{integration-name}/
├── .env              # Local API key (git-ignored)
├── .gitignore
├── bin/
│   └── ping.ts       # Runs the test call with a live API key
├── calls/
│   └── ping.ts       # Read-only API call to verify the integration
├── client.ts         # Scoped client with mock/real branching
├── client.mocks.ts   # Mock data and mock client implementation
├── env.schema.json   # Env variable declarations
├── env.ts            # Generated typed env (via @saflib/env)
├── index.ts
├── index.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.js
```

## Runtime Behavior: API Key and Mock Logic

The client uses a two-gate pattern. **Do not change this logic.** Getting it wrong breaks either tests or real API calls.

```ts
const apiKey = typedEnv.MY_API_KEY;
const isTest = typedEnv.NODE_ENV === "test";

// Gate 1: Throw if the key is missing and we're NOT in a test.
// A missing key in production/development is a configuration error.
if (!apiKey && !isTest) {
  throw new Error("MY_API_KEY is required. Set it in your environment or .env file.");
}

// Gate 2: Use mocks when the key is explicitly "mock" or when running tests.
// A missing key does NOT mean "use mock" — it means misconfigured.
export const isMocked = apiKey === "mock" || isTest;
```

### Why this matters

| Scenario | `apiKey` | `isTest` | Behavior |
|---|---|---|---|
| Unit tests (`vitest run`) | `undefined` | `true` | Skip throw, `isMocked = true` → mock client |
| Dev with `.env` key | `"sk-abc..."` | `false` | Pass throw, `isMocked = false` → real client |
| Dev forgot `.env` | `undefined` | `false` | **Throw** — catches misconfiguration early |
| CI with `API_KEY=mock` | `"mock"` | `false` | Pass throw, `isMocked = true` → mock client |

A common mistake is to fold the missing-key case into `isMocked` (e.g. `isMocked = !apiKey || ...`). This silently mocks when the key is absent, which hides configuration errors and causes `npm run ping` to return mock data instead of failing loudly.

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
2. **CI or environments without a real key** — Setting the env var to `"mock"` explicitly opts in to mock mode.

Keep mock responses minimal but structurally correct — the test suite (and any downstream code exercised by tests) needs the response shape to be accurate.

## Test Call (`calls/ping.ts`)

Every integration should include at least one read-only API call (conventionally `calls/ping.ts`). This call:

- Uses the scoped client (not the raw SDK).
- Calls a safe method (list, get, search — never create, update, or delete).
- Is exported from `index.ts` so the test suite can exercise it.
- Has a corresponding `bin/ping.ts` script and `npm run ping` command for manual verification with a live API key.

To test the integration manually:

1. Add your API key to `.env`.
2. Run `npm run ping`.
