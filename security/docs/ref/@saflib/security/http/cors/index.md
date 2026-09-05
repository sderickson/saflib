[**@saflib/security**](../../../../index.md)

---

# @saflib/security/http/cors

CORS response header assertions for security Playwright specs.

## Functions

| Function                                                                  | Description                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [assertCorsAllowsOrigin](functions/assertCorsAllowsOrigin.md)             | Allowed SPA origin should be echoed exactly on preflight/simple responses. |
| [assertCorsDoesNotAllowOrigin](functions/assertCorsDoesNotAllowOrigin.md) | Disallowed origins must not receive a reflected ACAO or wildcard.          |
| [getAccessControlAllowOrigin](functions/getAccessControlAllowOrigin.md)   | Read `Access-Control-Allow-Origin` case-insensitively.                     |
