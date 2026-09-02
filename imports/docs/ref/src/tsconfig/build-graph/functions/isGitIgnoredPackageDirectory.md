[**@saflib/imports**](../../../../index.md)

---

# Function: isGitIgnoredPackageDirectory()

> **isGitIgnoredPackageDirectory**(`packageDir`): `boolean`

Workspace members that exist on disk but are gitignored (e.g. saflib's
product-init `deploy/`) are absent in CI. Skip them so local generate/check
matches a clean checkout.

## Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `packageDir` | `string` |

## Returns

`boolean`
