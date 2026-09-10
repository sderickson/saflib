[**@saflib/monorepo**](../../../index.md)

---

# Function: isAllowedRootTsFile()

> **isAllowedRootTsFile**(`fileName`, `exportsMap?`): `boolean`

Root source file is allowed when allowlisted, or when `package.json`
exports it (`"."` → `./main.ts`, or `./<stem>` → `./<stem>.ts`).

## Parameters

| Parameter     | Type                            |
| ------------- | ------------------------------- |
| `fileName`    | `string`                        |
| `exportsMap?` | `Record`\<`string`, `unknown`\> |

## Returns

`boolean`
