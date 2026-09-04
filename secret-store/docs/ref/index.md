**@saflib/secret-store**

---

# `@saflib/secret-store`

Fetch secrets **after** checking they are declared in the calling package’s
`secrets.json`. Validation is package-local at the call site — there is no
process-wide secret registry or boot-time monorepo graph walk.

This package provides the abstract `SecretStore`, an env-backed
implementation, and a process-level singleton (`setSecretStore` /
`getSecretStore`). Vendor backends (e.g. Infisical) live in
`@saflib/vendors-*` packages.

## Declare secrets

Add `secrets.json` next to the package’s `package.json`:

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

Prefer importing `./secrets.json` next to the `configure*` function that owns
the secret.

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

Infisical connection env (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`,
`INFISICAL_ENVIRONMENT`) is declared on `@saflib/vendors-infisical`.
Sentinel `"mock"` for `INFISICAL_TOKEN` selects the mock Infisical client.
