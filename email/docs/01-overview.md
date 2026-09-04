# Overview

The email suite provides a consistent structure for email templates, an `EmailService` abstraction for integrating with your third-party provider, and an in-memory mock coupled with an admin API and UI for inspecting sent messages in development and CI.

## Package structure and integration

See [base](https://github.com/sderickson/saflib/tree/main/base/service/email), which defines product email templates (`@saflib/base-email`). The expected way to integrate these into your service is:

- Implement or resolve an `EmailService` and call `sendEmail` from your handlers.
- Mount `createEmailsRouter` from `@saflib/email-service` on your API in development so sent emails can be inspected.
- Add `@saflib/email-vue` pages to the admin SPA for browsing mock sends and testing email-driven flows in Playwright.

`@saflib/base-http` mounts the mock email router automatically in development deployments.

## Packages

| Package                 | Role                                                 | Docs                                              |
| ----------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `@saflib/email-spec`    | OpenAPI spec for the mock email inspection API       | [Code reference](../email-spec/docs/ref/index.md) |
| `@saflib/email-service` | `EmailService` types, mock store, and Express routes |                                                   |
| `@saflib/email-vue`     | Admin SPA pages (`SentEmails`, `LastMockEmailPage`)  | [Overview](../email-vue/docs/01-overview.md)         |

## Vendor implementations

Production backends implement `EmailService` in vendor packages:

- [`@saflib/vendors-brevo`](../../vendors/brevo/configureEmail.ts) — `configureEmail()` / `BrevoEmailService`

Resolve API keys via [`@saflib/secret-store`](../../secret-store/docs/01-overview.md). Development uses the in-memory mock from `@saflib/email-service`.
