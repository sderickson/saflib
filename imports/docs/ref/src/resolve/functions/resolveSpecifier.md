[**@saflib/imports**](../../../index.md)

---

# Function: resolveSpecifier()

> **resolveSpecifier**(`spec`, `fromFile`, `index`): [`ResolveResult`](../../types/type-aliases/ResolveResult.md)

Resolve an import specifier relative to `fromFile` against the package index.
Returns a workspace file, an external root, or null (unresolved relative).

## Parameters

| Parameter  | Type                                                       |
| ---------- | ---------------------------------------------------------- |
| `spec`     | `string`                                                   |
| `fromFile` | `string`                                                   |
| `index`    | [`PackageIndex`](../../types/type-aliases/PackageIndex.md) |

## Returns

[`ResolveResult`](../../types/type-aliases/ResolveResult.md)
