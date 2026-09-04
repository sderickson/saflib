# Overview

`ory-kratos` integrates [Ory Kratos](https://www.ory.sh/docs/kratos/) into SAF products — custom Vue auth UI, TanStack Query bindings for browser flows, and an internal HTTP service for courier webhooks and identity actions.

Products using Kratos follow the same pattern as [`base`](../../base/docs/01-overview.md): the **auth** SPA mounts `@saflib/ory-kratos-spa`, other SPAs depend on `@saflib/ory-kratos-sdk` for session, and the monolith starts `@saflib/ory-kratos-http` for courier/action callbacks wired through product-specific handlers (see [`base/service/kratos-handlers`](../../base/service/kratos-handlers/)).

Local Kratos runs in [`base/dev/kratos`](../../base/dev/kratos/).

## What this suite provides

| Package | Role |
| ------- | ---- |
| `ory-kratos-http` | Internal Express app: Kratos courier webhook (`/email/kratos-courier`), optional action webhook (`/kratos/action`), admin identity helpers |
| `ory-kratos-sdk` | TanStack Query queries/mutations for Kratos Frontend API (flows, session, MSW fakes) |
| `ory-kratos-spa` | Custom Vue UI for login, registration, recovery, verification, settings; Playwright fixtures |

There is no OpenAPI spec package — Kratos's own Frontend API is the wire contract. Product specs may still define shared types such as [`KratosIdentity`](../../base/service/spec/schemas/kratos-identity.yaml) for app data that references Kratos identities.

## Integration

**Server (monolith boot)** — [`base/service/monolith/run.ts`](../../base/service/monolith/run.ts) calls `startOryKratosService()` with courier callbacks and action handlers from `@saflib/base-kratos-handlers`. Mount alongside the main HTTP app; the courier server listens on `KRATOS_HANDLER_HTTP_HOST`.

**Auth SPA** — [`base/clients/auth`](../../base/clients/auth/AuthSpa.vue) calls `configureAuthApp()` from `@saflib/ory-kratos-spa` and uses `createKratosAuthRouter` + optional session routes.

**Other SPAs** — import `useKratosSession` and flow helpers from `@saflib/ory-kratos-sdk`. Embed settings or verification from `@saflib/ory-kratos-spa/settings` and `./verification` on the account SPA.

**E2E / security tests** — Playwright fixtures from `@saflib/ory-kratos-spa/fixtures`; see [`base/security`](../../base/security/).

## Package docs

- [HTTP service](../ory-kratos-http/docs/01-overview.md) — courier callbacks, action handler, identity resolution
- [SDK](../ory-kratos-sdk/docs/01-overview.md) — browser flows and session queries
- [Auth SPA](../ory-kratos-spa/docs/01-overview.md) — custom Kratos UI and routing
