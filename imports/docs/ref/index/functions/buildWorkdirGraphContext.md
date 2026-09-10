[**@saflib/imports**](../../index.md)

---

# Function: buildWorkdirGraphContext()

> **buildWorkdirGraphContext**(`options`): `Promise`\<[`WorkdirGraphContext`](../interfaces/WorkdirGraphContext.md)>\>

Walk the tree once and build import/export specialties for graph analysis.

## Parameters

| Parameter | Type                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| `options` | `Pick`\<[`WorkdirAnalyzeOptions`](../interfaces/WorkdirAnalyzeOptions.md), `"monorepoRoot"` \| `"productRoot"`\> |

## Returns

`Promise`\<[`WorkdirGraphContext`](../interfaces/WorkdirGraphContext.md)\>
