# Overview

`@saflib/vendors-infisical` wires [Infisical](https://infisical.com) as the production backend for [`@saflib/secret-store`](../../../secret-store/docs/01-overview.md).

## What this package provides

- **`configureSecretStore()`** — idempotent startup helper; registers `InfisicalSecretStore` from env
- **`InfisicalSecretStore`** — implements `SecretStore`; fetches secrets by name from an Infisical project/environment
- **`getSecretStore()` / `resetSecretStoreForTests`** — read or reset the configured store

## Integration

Call `configureSecretStore()` at process startup before wiring email, object storage, or other integrations that read secrets. Locally use `EnvSecretStore` or set `INFISICAL_TOKEN=mock` for placeholder resolution.

Environment (see `env.schema.json`):

- **`INFISICAL_TOKEN`** — access token; `mock` selects the mock client
- **`INFISICAL_PROJECT_ID`** — project id (optional when token is `mock`)
- **`INFISICAL_ENVIRONMENT`** — environment slug (e.g. `dev`, `staging`, `prod`)

Vendor packages such as [`@saflib/vendors-brevo`](../../brevo/docs/01-overview.md) fetch API keys through the configured store.
