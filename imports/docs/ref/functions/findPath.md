[**@saflib/imports**](../index.md)

---

# Function: findPath()

> **findPath**(`entryPath`, `target`, `options`): [`FindPathResult`](../type-aliases/FindPathResult.md)

BFS for the shortest import path from `entryPath` to `target`.

`target` may be a workspace file path, workspace package name, or external
package root (e.g. `stripe`).

## Parameters

| Parameter   | Type                                                          |
| ----------- | ------------------------------------------------------------- |
| `entryPath` | `string`                                                      |
| `target`    | `string`                                                      |
| `options`   | [`MeasureGraphOptions`](../interfaces/MeasureGraphOptions.md) |

## Returns

[`FindPathResult`](../type-aliases/FindPathResult.md)
