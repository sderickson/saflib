[**@saflib/security**](../../../../index.md)

---

# @saflib/security/http/headers

Security response header inspection helpers for Playwright specs.

## Type Aliases

| Type Alias                                                                   | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [AssertSecurityHeadersOptions](type-aliases/AssertSecurityHeadersOptions.md) | -           |

## Functions

| Function                                                                | Description                                                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [assertSecurityHeaders](functions/assertSecurityHeaders.md)             | Assert baseline edge security headers on an HTML/SPA response. Matches Caddy `(security-headers)` + per-site CSP expectations used in SAF products. |
| [cspAllowsDevDevtoolsFraming](functions/cspAllowsDevDevtoolsFraming.md) | Dev stack: vite-plugin-vue-devtools iframes sibling SPAs (devtools UI path).                                                                        |
| [cspDeniesFraming](functions/cspDeniesFraming.md)                       | CSP `frame-ancestors 'none'` or unquoted `none` after the directive.                                                                                |
| [getContentSecurityPolicy](functions/getContentSecurityPolicy.md)       | -                                                                                                                                                   |
| [hasBaselineCsp](functions/hasBaselineCsp.md)                           | -                                                                                                                                                   |
| [normalizeHeaders](functions/normalizeHeaders.md)                       | Lower-case header names for case-insensitive lookup.                                                                                                |
