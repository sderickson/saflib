[**@saflib/imports**](../../index.md)

---

# Function: analyzePackageFromWorkdirContext()

> **analyzePackageFromWorkdirContext**(`ctx`, `target`, `options`): [`WorkdirPackageAnalyzeResult`](../interfaces/WorkdirPackageAnalyzeResult.md)

Analyze one package from a pre-built [WorkdirGraphContext](../interfaces/WorkdirGraphContext.md).

## Parameters

| Parameter            | Type                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ctx`                | [`WorkdirGraphContext`](../interfaces/WorkdirGraphContext.md)                                                             |
| `target`             | \{ `directory`: `string`; `packageDir`: `string`; `packageName`: `string`; \}                                             |
| `target.directory`   | `string`                                                                                                                  |
| `target.packageDir`  | `string`                                                                                                                  |
| `target.packageName` | `string`                                                                                                                  |
| `options`            | `Pick`\<[`WorkdirAnalyzeOptions`](../interfaces/WorkdirAnalyzeOptions.md), `"includeLayout"` \| `"includeExportsCheck"`\> |

## Returns

[`WorkdirPackageAnalyzeResult`](../interfaces/WorkdirPackageAnalyzeResult.md)
