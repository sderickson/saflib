[**@saflib/imports**](../../../../index.md)

---

# Function: listGitIgnoredPackageDirectories()

> **listGitIgnoredPackageDirectories**(`rootDir`, `packageDirs`): `Set`\<`string`\>

Batch `git check-ignore` for many package dirs under one repo root.
Returns absolute paths that are ignored. One spawn instead of one per package.

## Parameters

| Parameter     | Type                   |
| ------------- | ---------------------- |
| `rootDir`     | `string`               |
| `packageDirs` | `Iterable`\<`string`\> |

## Returns

`Set`\<`string`\>
