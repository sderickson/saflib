[**@saflib/imports**](../../../../index.md)

---

# Function: measureGraph()

> **measureGraph**(`entryPath`, `options`): [`MeasureGraphResult`](../../../types/interfaces/MeasureGraphResult.md)

Walk the static import graph from `entryPath` and count first-party modules,
total lines, and distinct external npm package roots.

## Parameters

| Parameter   | Type                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| `entryPath` | `string`                                                                  |
| `options`   | [`MeasureGraphOptions`](../../../types/interfaces/MeasureGraphOptions.md) |

## Returns

[`MeasureGraphResult`](../../../types/interfaces/MeasureGraphResult.md)
