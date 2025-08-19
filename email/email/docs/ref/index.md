**@saflib/email**

***

# @saflib/email

## Interfaces

| Interface | Description |
| ------ | ------ |
| [EmailOptions](interfaces/EmailOptions.md) | Accepted options when sending an email. A subset of what nodemailer accepts. See [Nodemailer docs](https://nodemailer.com/message/) for more details. |
| [EmailResult](interfaces/EmailResult.md) | Result of sending an email. This *ought* to be based on types provided by nodemailer. However, they don't seem to export SMTPTransport types... |
| [SentEmail](interfaces/SentEmail.md) | A record of an email that was sent. Only used for mocking. |

## Variables

| Variable | Description |
| ------ | ------ |
| [emailClient](variables/emailClient.md) | Global instance of the email client. Since the config is loaded by the environment, and services shouldn't try to set up multiple SMTP connections, this can be a singleton. |
| [mockingOn](variables/mockingOn.md) | Whether the email client is currently being mocked, and emails are being saved to `sentEmails`. |
| [sentEmails](variables/sentEmails.md) | An array of emails that were sent by this service. Only used for mocking. |

## Functions

| Function | Description |
| ------ | ------ |
| [createEmailsRouter](functions/createEmailsRouter.md) | Creates an Express router that can be used to access sent emails. Only used for E2E testing. |
