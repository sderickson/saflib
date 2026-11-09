# Overview

`@saflib/ory-kratos-spa` provides **custom Vue UI** for Ory Kratos self-service browser flows — login, registration, recovery, verification, settings, and logout — built on [`@saflib/ory-kratos-sdk`](../../ory-kratos-sdk/docs/01-overview.md).

See the [suite overview](../../docs/01-overview.md) and [`base/product/clients/auth`](https://github.com/sderickson/saflib/blob/main/base/product/clients/auth/) for product wiring.

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

## Second factors

SAF products offer two second factors (AAL2), and users pick either or both:

- **Authenticator app** (TOTP).
- **Passkey or security key**: Kratos's `webauthn` method with `passwordless: false`.

The first-factor `passkey` method (passwordless sign-in) stays off: it drives the same browser prompt as `webauthn`, so the two compete. The platform and product templates (`base/platform/kratos*`, `base/product/dev/kratos`) ship this setup. It takes all three of the following; leaving any out fails quietly:

1. **`kratos.yml`**: `totp` and `webauthn` enabled. The `webauthn` `rp.origins` list every page that runs the ceremony, which is auth (sign-in) and account (setup).
2. **`identity.schema.json`**: the email trait's credentials mark `webauthn: { identifier: true }` and `totp: { account_name: true }`. Without the webauthn identifier, the browser creates a key but Kratos never attaches it, and the settings page just reloads.
3. **Account `/mfa` route**: `SettingsSectionAsync` with `section: "mfa"`, which renders both groups from one flow. `section: "totp"` shows only the authenticator app.

A settings flow lists only the methods enabled when it was created, so after changing methods, open the settings page without a `?flow=` parameter.

## Page structure

Each flow uses `*Async.vue` (lazy load), a page `*.vue` (fetch flow, error panels), and `*FlowForm.vue` (submit). Shared rendering goes through `common/KratosFlowUi.vue`.

For file conventions, slots, WebAuthn/passkey integration, and extension patterns, see [Auth SPA architecture](./02-auth-spa-architecture.md).
