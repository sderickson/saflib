[**@saflib/vite**](../index.md)

---

# workspace-package-exports-plugin

## Interfaces

| Interface                                                                                  | Description |
| ------------------------------------------------------------------------------------------ | ----------- |
| [WorkspacePackageExportsPluginOptions](interfaces/WorkspacePackageExportsPluginOptions.md) | -           |

## Functions

| Function                                                                    | Description                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [workspacePackageExportsPlugin](functions/workspacePackageExportsPlugin.md) | Resolve workspace packages through `package.json` exports (including wildcard patterns). Node and Vite greedily match single `*` export keys across path segments; this plugin matches one segment per `*` like `saf-imports` does. |
