**@saflib/vendors-brevo**

---

# @saflib/vendors-brevo

## Classes

| Class                                             | Description                                                                                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [BrevoEmailService](classes/BrevoEmailService.md) | Sends email via [Brevo transactional API](https://developers.brevo.com/reference/send-transac-email) (`sendTransacEmail`). Pass `"mock"` as the API key to append to sentEmails without calling the API. |

## Variables

| Variable                                                        | Description                                               |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [BREVO\_API\_KEY\_NAME](variables/BREVO_API_KEY_NAME.md)        | -                                                         |
| [createBrevoEmailService](variables/createBrevoEmailService.md) | Alias matching the Infisical-style vendor factory naming. |

## Functions

| Function                                                              | Description                                                                                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [configureEmail](functions/configureEmail.md)                         | Resolves a Brevo-backed EmailService from the secret store using this package's `secrets.json`. Missing/empty secrets fall back to mock. |
| [createEmailService](functions/createEmailService.md)                 | Creates a Brevo-backed email service. Pass `"mock"` to record sends in the shared in-memory mock store without calling the API.          |
| [resolveEmailServiceFromEnv](functions/resolveEmailServiceFromEnv.md) | Shared email service for monolith HTTP routers and product code.                                                                         |
