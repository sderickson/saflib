# Overview

`@saflib/secret-store` defines a shared **secret lookup** interface for runtime configuration. Fetch secrets **after** checking they are declared in the calling package's `secrets.json`. Validation is package-local at the call site — there is no process-wide secret registry or boot-time monorepo graph walk.

This package provides the abstract `SecretStore`, an env-backed implementation, and a process-level singleton (`setSecretStore` / `getSecretStore`). Vendor backends (e.g. Infisical) live in `@saflib/vendors-*` packages.

## What this package provides

- **`SecretStore`** — `getSecretByName(name, packageSecrets)` after manifest validation
- **`EnvSecretStore`** — reads from `process.env`
- **`createSecretStore`** — factory for env-backed stores in tests and local dev
- **`secrets-manifest`** — `isSecretDeclared`, `SecretManifest` types
- **Errors** — `SecretNotDeclaredError`, `EnvSecretNotFoundError` ([`ReturnsError`](../../utils/docs/01-overview.md))

Code reference: [`docs/ref/`](./ref/index.md).

## Declare secrets

Add `secrets.json` next to the package's `package.json`:

```json
[
  {
    "name": "STRIPE_SECRET_API_KEY",
    "description": "Stripe secret API key. Sentinel \"mock\" selects the in-memory mock client."
  }
]
```

Required fields: `name`, `description`. Metadata only — never put values here.

## Fetch with the package manifest

```ts
import type { SecretStore } from "@saflib/secret-store";
import packageSecrets from "./secrets.json" with { type: "json" };

const out = await store.getSecretByName(
  "STRIPE_SECRET_API_KEY",
  packageSecrets,
);
if (out.error) {
  // includes SecretNotDeclaredError when the name is missing from packageSecrets
}
```

`getSecretByName(name, packageSecrets)`:

1. Returns `SecretNotDeclaredError` if `name` is not in `packageSecrets`.
2. Otherwise fetches from the configured backend.

Prefer importing `./secrets.json` next to the `configure*` function that owns the secret.

## Creating a store

```ts
import {
  createSecretStore,
  setSecretStore,
  getSecretStore,
} from "@saflib/secret-store";

// Env-backed (typical for CLIs and base template):
const store = createSecretStore({ type: "env" });
setSecretStore(store);

// Infisical (product opt-in via @saflib/vendors-infisical):
import {
  configureSecretStore,
  getSecretStore,
} from "@saflib/vendors-infisical";
configureSecretStore();
const store = getSecretStore();
```

## Vendor implementations

Production backends implement `SecretStore` in vendor packages:

- [`@saflib/vendors-infisical`](../../vendors/infisical/docs/01-overview.md) — Infisical vault

Infisical connection env (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`, `INFISICAL_ENVIRONMENT`) is declared on `@saflib/vendors-infisical`. Sentinel `"mock"` for `INFISICAL_TOKEN` selects the mock Infisical client.

Use `createSecretStore({ type: "env" })` or `INFISICAL_TOKEN=mock` locally; call `configureSecretStore()` at startup in production. Other vendors (e.g. [`@saflib/vendors-brevo`](../../vendors/brevo/docs/01-overview.md)) fetch API keys through the configured store.

## Integration

Service bootstrap calls `setSecretStore` (via a vendor `configure*` helper) before wiring email, object storage, or other integrations that need secrets at runtime.
