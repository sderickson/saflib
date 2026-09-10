[**@saflib/vendors-sentry-node**](../../index.md)

---

# Function: rewriteSentrySourcesToMonorepoRelative()

> **rewriteSentrySourcesToMonorepoRelative**(`monorepoRoot`, `source`, `_map`, `context?`): `string`

`sources` path rewrite for Sentry uploads: Rollup emits paths relative to each chunk under
`dist/assets`; normalize to repo-relative paths for readable stack traces.

## Parameters

| Parameter         | Type                      |
| ----------------- | ------------------------- |
| `monorepoRoot`    | `string`                  |
| `source`          | `string`                  |
| `_map`            | `unknown`                 |
| `context?`        | \{ `mapDir`: `string`; \} |
| `context.mapDir?` | `string`                  |

## Returns

`string`
