[**@saflib/imports**](../../../index.md)

---

# Function: buildPackageIndex()

> **buildPackageIndex**(`root`): [`PackageIndex`](../../types/type-aliases/PackageIndex.md)

Build a map of workspace package name → { dir, exports }.
Scans the tree (SAF layout); does not depend on `@saflib/dev-tools`.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `root`    | `string` |

## Returns

[`PackageIndex`](../../types/type-aliases/PackageIndex.md)
