[**@saflib/dev-tools**](../index.md)

---

# Function: getAllPackageWorkspaceDependencies()

> **getAllPackageWorkspaceDependencies**(`packageName`, `monorepoContext`): `Set`\<`string`\>

Returns all direct and transitive "@saflib/\*" dependencies for a given package.

## Parameters

| Parameter         | Type                                                  |
| ----------------- | ----------------------------------------------------- |
| `packageName`     | `string`                                              |
| `monorepoContext` | [`MonorepoContext`](../interfaces/MonorepoContext.md) |

## Returns

`Set`\<`string`\>
