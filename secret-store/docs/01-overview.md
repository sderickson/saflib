# Overview

`@saflib/secret-store` defines a shared **secret lookup** interface for runtime configuration. Packages declare required secrets in `secrets.json` manifests; implementations resolve values from environment variables (development/tests) or a remote vault (production).

## What this package provides

- **`SecretStore`** — abstract `getSecret(name)` interface
- **`EnvSecretStore`** — reads from `process.env` (and declared manifest keys)
- **`createSecretStore`** — factory for env-backed stores in tests and local dev
- **`secrets-manifest`** — helpers to validate that requested secret names are declared

## Vendor implementations

Production backends implement `SecretStore` in vendor packages:

- [`@saflib/vendors-infisical`](../../vendors/infisical/docs/01-overview.md) — Infisical vault

Use `EnvSecretStore` or `INFISICAL_TOKEN=mock` locally; call `configureSecretStore()` at startup in production. Vendor packages such as [`@saflib/vendors-brevo`](../../vendors/brevo/docs/01-overview.md) fetch API keys through the configured store.

## Integration

Service bootstrap calls `setSecretStore` (via a vendor `configure*` helper) before wiring email, object storage, or other integrations that need secrets at runtime.
