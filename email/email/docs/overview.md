# Overview

Set of packages for sending emails and some developer tools around email sends. Uses [nodemailer](https://nodemailer.com/).

## Features

This just adds some niceties around Nodemailer so it integrates well with the rest of SAF.

- [Specified env variable](./env.md) inherited by any package which depends on `@saflib/email`.
- Automatic mocking when run in a test environment or when `MOCK_INTEGRATION` is "true".
- Backend and frontend for accessing mock emails in E2E tests.

I've only ever tested this using SMTP, so your mileage may vary with other sorts of transports.
