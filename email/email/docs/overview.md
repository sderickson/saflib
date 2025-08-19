# Overview

Set of packages for sending emails and some developer tools around email sends. Uses [nodemailer](https://nodemailer.com/).

## Features

This just adds some niceties around Nodemailer so it integrates well with the rest of SAF.

- [Specified env variable](./env.md) inherited by any package which depends on `@saflib/email`.
- Automatic mocking when run in a test environment or when `MOCK_INTEGRATION` is "true".
- Backend and frontend for accessing mock emails in E2E tests.

I've only ever tested this using SMTP, so your mileage may vary with other sorts of transports.

## Related Packages

### Public

To view sent emails for Playwright tests, render the page provided by [@saflib/email-vue](../../email-vue/docs/overview.md).

### Private

For development of the email packages.

- [@saflib/email-spec](../../email-spec/docs/ref/index.md)
