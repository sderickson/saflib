# Overview

`@saflib/vendors-infisical` wires [Infisical](https://infisical.com) as the production backend for [`@saflib/secret-store`](../../../secret-store/docs/01-overview.md).

## What this package provides

- **`configureSecretStore()`** — idempotent startup helper; registers `InfisicalSecretStore` from env
- **`InfisicalSecretStore`** — implements `SecretStore`; fetches secrets by name from an Infisical project/environment
- **`getSecretStore()` / `resetSecretStoreForTests`** — read or reset the configured store

## Integration

Call `configureSecretStore()` at process startup before wiring email, object storage, or other integrations that read secrets. Locally use `EnvSecretStore` or set `INFISICAL_TOKEN=mock` for placeholder resolution.

Environment (see `env.schema.json`):

- **`INFISICAL_CLIENT_ID`** + **`INFISICAL_CLIENT_SECRET`** — machine identity [Universal Auth](https://infisical.com/docs/documentation/platform/identities/universal-auth) credentials (preferred for deployed services). The store logs in on the first secret fetch, shares that login across concurrent fetches, and logs in again (retrying once) when Infisical rejects the short-lived access token.
- **`INFISICAL_TOKEN`** — static access token (machine identity Token Auth); `mock` selects the mock client. Used when the Universal Auth pair is not set.
- **`INFISICAL_PROJECT_ID`** — project id (optional in mock mode)
- **`INFISICAL_ENVIRONMENT`** — environment slug (e.g. `dev`, `staging`, `prod`)

On startup, `configureSecretStore()` logs whether the store came up in **live** or **mock** mode and which auth method it uses (client id prefix or token length / project prefix / environment — never the raw secret). If live mode is missing project id or environment, it logs an error. Ensure secret env files end with a trailing newline so Docker Compose does not drop the last variable.

Vendor packages such as [`@saflib/vendors-brevo`](../../brevo/docs/01-overview.md) fetch API keys through the configured store.
