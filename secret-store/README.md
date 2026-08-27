# `@saflib/secret-store`

Fetch secrets from Infisical (or env) **after** checking they are declared in the
calling package’s `secrets.json`. Validation is package-local at the call site —
there is no process-wide secret registry or boot-time monorepo graph walk.

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

const out = await store.getSecretByName("STRIPE_SECRET_API_KEY", packageSecrets);
if (out.error) {
  // includes SecretNotDeclaredError when the name is missing from packageSecrets
}
```

`getSecretByName(name, packageSecrets)`:

1. Returns `SecretNotDeclaredError` if `name` is not in `packageSecrets`.
2. Otherwise fetches from Infisical / env as configured.

Prefer importing `./secrets.json` next to the `configure*` function that owns
the secret. Put values in Infisical (or local env / `"mock"` sentinel).

## Developer workflow

1. Add `{ name, description }` to the package’s `secrets.json`.
2. In that package’s configure / client setup: `getSecretByName(name, packageSecrets)`.
3. Put the value in Infisical / local env (or `"mock"`).
4. Dev-site Checkout → package → **Secrets** tab confirms the declaration
   (names + descriptions only; never live values).

## Creating a store

```ts
import { createSecretStore, configureSecretStore, getSecretStore } from "@saflib/secret-store";

// Process-level (reads INFISICAL_TOKEN / PROJECT_ID / ENVIRONMENT from env):
configureSecretStore();
const store = getSecretStore();

// Or construct explicitly:
const store = createSecretStore({ type: "env" });
// or
const store = createSecretStore({
  type: "infisical",
  options: {
    accessToken: process.env.INFISICAL_TOKEN ?? "",
    projectId: process.env.INFISICAL_PROJECT_ID ?? "",
    environment: process.env.INFISICAL_ENVIRONMENT ?? "",
  },
});
```

Infisical connection env (`INFISICAL_TOKEN`, `INFISICAL_PROJECT_ID`,
`INFISICAL_ENVIRONMENT`) is declared on this package’s `env.schema.json`.
Composition roots (e.g. daemon-service-common) inherit them via the env-parent
graph. Sentinel `"mock"` for `INFISICAL_TOKEN` selects the mock Infisical client.
