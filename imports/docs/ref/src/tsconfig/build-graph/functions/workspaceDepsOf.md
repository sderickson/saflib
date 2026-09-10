[**@saflib/imports**](../../../../index.md)

---

# Function: workspaceDepsOf()

> **workspaceDepsOf**(`pj`, `packages`): `string`[]

Collect workspace package names listed in `dependencies` only.
Dev dependencies (test harnesses, vitest, playwright, etc.) are omitted —
they are not installed in production Docker builds and must not become
composite project references.

Subpath dependency keys (e.g. `@saflib/utils/telemetry-sanitize`) resolve to
their workspace package root (`@saflib/utils`).

## Parameters

| Parameter  | Type              |
| ---------- | ----------------- |
| `pj`       | `PackageJson`     |
| `packages` | `Set`\<`string`\> |

## Returns

`string`[]
