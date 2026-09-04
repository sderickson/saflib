[**@saflib/security**](../../../../../index.md)

---

# Function: createSecurityPlaywrightConfig()

> **createSecurityPlaywrightConfig**(`options`): `PlaywrightTestConfig`\<\{ \}, \{ \}\>

Default config for prod-local docker compose security suites.

- Chromium only (HTTP-level checks; no cross-browser matrix)
- Serial workers (shared bootstrap accounts)
- Excludes `@canary` specs — use createSecurityCanaryPlaywrightConfig for those

## Parameters

| Parameter | Type                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------- |
| `options` | [`CreateSecurityPlaywrightConfigOptions`](../type-aliases/CreateSecurityPlaywrightConfigOptions.md) |

## Returns

`PlaywrightTestConfig`\<\{ \}, \{ \}\>
