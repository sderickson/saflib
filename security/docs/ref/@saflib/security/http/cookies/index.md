[**@saflib/security**](../../../../index.md)

---

# @saflib/security/http/cookies

Cookie attribute assertions for security Playwright specs.

## Type Aliases

| Type Alias                                                                   | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [SecureCookieAssertionOptions](type-aliases/SecureCookieAssertionOptions.md) | -           |

## Functions

| Function                                                            | Description                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [assertCsrfCookie](functions/assertCsrfCookie.md)                   | Assert double-submit CSRF cookie shape (readable by JS, host-only domain). |
| [assertSecureSessionCookie](functions/assertSecureSessionCookie.md) | Assert session cookie hardening (HttpOnly, SameSite, Secure in prod).      |
| [findCsrfCookie](functions/findCsrfCookie.md)                       | Double-submit CSRF cookie set by `@saflib/express` CSRF middleware.        |
| [findSessionCookie](functions/findSessionCookie.md)                 | Ory/Kratos session cookie (excludes CSRF and continuity cookies).          |
