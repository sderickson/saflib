[**@saflib/security**](../../../../index.md)

---

# @saflib/security/playwright/env

Environment defaults for product security Playwright suites.

## Type Aliases

| Type Alias                                                                   | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [SecurityPlaywrightEnvOptions](type-aliases/SecurityPlaywrightEnvOptions.md) | -           |

## Functions

| Function                                                              | Description                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [applyLocalDevSecurityEnv](functions/applyLocalDevSecurityEnv.md)     | Prod-local docker compose stack (HTTP).                                                                                                                                                                      |
| [applyProductionCanaryEnv](functions/applyProductionCanaryEnv.md)     | Production HTTPS canary checks (`@canary` tagged specs).                                                                                                                                                     |
| [applySecurityPlaywrightEnv](functions/applySecurityPlaywrightEnv.md) | Set `DOMAIN` and `PROTOCOL` for security specs. Only assigns keys that are provided — existing env values are left unchanged. Service health checks use a hardcoded `api` subdomain in `@saflib/playwright`. |
