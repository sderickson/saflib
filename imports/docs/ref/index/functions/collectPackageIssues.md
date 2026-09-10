[**@saflib/imports**](../../index.md)

---

# Function: collectPackageIssues()

> **collectPackageIssues**(`detail`, `options`): [`PackageIssue`](../interfaces/PackageIssue.md)[]

Graph-derived issues: dead exports/queries (plus merged layoutIssues).
Same-file-only exports are not reported — self-use is enough to clear dead-code.

## Parameters

| Parameter                   | Type                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `detail`                    | [`PackageDetailForIssues`](../interfaces/PackageDetailForIssues.md) |
| `options`                   | \{ `packageDirectory?`: `string`; `productRoot?`: `string`; \}      |
| `options.packageDirectory?` | `string`                                                            |
| `options.productRoot?`      | `string`                                                            |

## Returns

[`PackageIssue`](../interfaces/PackageIssue.md)[]
