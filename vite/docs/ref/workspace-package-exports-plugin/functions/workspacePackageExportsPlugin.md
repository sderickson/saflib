[**@saflib/vite**](../../index.md)

---

# Function: workspacePackageExportsPlugin()

> **workspacePackageExportsPlugin**(`options`): `Plugin`

Resolve workspace packages through `package.json` exports (including wildcard
patterns). Node and Vite greedily match single `*` export keys across path
segments; this plugin matches one segment per `*` like `saf-imports` does.

Self-contained (no `@saflib/imports`) so minimal Docker images stay small.

## Parameters

| Parameter | Type                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| `options` | [`WorkspacePackageExportsPluginOptions`](../interfaces/WorkspacePackageExportsPluginOptions.md) |

## Returns

`Plugin`
