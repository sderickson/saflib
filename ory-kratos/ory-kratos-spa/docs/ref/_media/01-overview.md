# Overview

`@saflib/ory-kratos-spa` provides **custom Vue UI** for Ory Kratos self-service browser flows — login, registration, recovery, verification, settings, and logout — built on [`@saflib/ory-kratos-sdk`](../../../../ory-kratos-sdk/docs/01-overview.md).

See the [suite overview](../../../../docs/01-overview.md) and [`base/clients/auth`](https://github.com/sderickson/saflib/blob/main/base/clients/auth/) for product wiring.

## What this package provides

| Export                              | Purpose                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `@saflib/ory-kratos-spa`            | `configureAuthApp`, auth fallback inject                       |
| `./router`                          | `createKratosAuthRouter` — logged-out flows + logout           |
| `./session-routes`                  | Settings + verify-wall routes (auth or account SPA)            |
| `./settings`                        | `SettingsSectionAsync` for account SPA embeds                  |
| `./registration`, `./verification`  | Override building blocks for product account pages             |
| `./fixtures`                        | Playwright fixtures (login, logout, registration, verify-wall) |
| `./strings`, `./i18n`, `./test-app` | i18n and Vitest helpers                                        |

## Auth vs session placement

```
auth SPA  → createKratosAuthRouter (login, registration, recovery, verification, logout)
account   → SettingsSectionAsync on product routes (/email, /password, /mfa, …)
optional  → kratosSessionRouteRecords() on auth for /settings + /verify-wall
```

Products configure recovery → settings redirects via `configureAuthApp({ postRecoverySettingsHref })`.

## Page structure

Each flow uses `*Async.vue` (lazy load), a page `*.vue` (fetch flow, error panels), and `*FlowForm.vue` (submit). Shared rendering goes through `common/KratosFlowUi.vue`.

For file conventions, slots, WebAuthn/passkey integration, and extension patterns, see [Auth SPA architecture](./02-auth-spa-architecture.md).
