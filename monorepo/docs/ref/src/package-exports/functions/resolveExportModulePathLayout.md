[**@saflib/monorepo**](../../../index.md)

---

# Function: resolveExportModulePathLayout()

> **resolveExportModulePathLayout**(`groupName`, `targetName`): [`ExportModulePathLayout`](../interfaces/ExportModulePathLayout.md)

Validates an export module path from parsePath and returns how to
upsert `package.json` exports (glob on the first folder segment, or an
explicit `./stem` entry for allowlisted root files).

## Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `groupName`  | `string` |
| `targetName` | `string` |

## Returns

[`ExportModulePathLayout`](../interfaces/ExportModulePathLayout.md)
