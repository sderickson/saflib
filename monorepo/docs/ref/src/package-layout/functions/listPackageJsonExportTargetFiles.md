[**@saflib/monorepo**](../../../index.md)

---

# Function: listPackageJsonExportTargetFiles()

> **listPackageJsonExportTargetFiles**(`exportsMap?`): `string`[]

Concrete `package.json` `exports` file targets (`main.ts`, `test-app.ts`).
Skips glob remaps (`./foo/*`).

## Parameters

| Parameter     | Type                                        |
| ------------- | ------------------------------------------- |
| `exportsMap?` | `string` \| `Record`\<`string`, `unknown`\> |

## Returns

`string`[]
