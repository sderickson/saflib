# Overview

`@saflib/vendors-brevo` implements [`EmailService`](../../../email/docs/01-overview.md) against the [Brevo](https://www.brevo.com) (Sendinblue) transactional email API.

## What this package provides

- **`configureEmail(store)`** — resolves `BrevoEmailService` from a [`SecretStore`](../../../secret-store/docs/01-overview.md); falls back to mock when the API key is missing
- **`BrevoEmailService`** — sends templated email via Brevo's SDK
- **`createEmailService(apiKey)`** — direct factory when you already have a key
- **`secrets.json`** — declares `BREVO_API_KEY` for manifest validation

## Integration

At service bootstrap, after configuring the secret store:

```ts
const emailService = await configureEmail(getSecretStore());
```

Development uses the in-memory mock from `@saflib/email-service` and the admin Sent Emails UI; production resolves `BREVO_API_KEY` from Infisical or env via the configured store.
