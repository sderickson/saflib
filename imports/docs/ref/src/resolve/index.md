[**@saflib/imports**](../../index.md)

---

# src/resolve

## Functions

| Function                                                          | Description                                                                                                                                              |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [buildPackageIndex](functions/buildPackageIndex.md)               | Build a map of workspace package name → { dir, exports }. Scans the tree (SAF layout); does not depend on `@saflib/dev-tools`.                           |
| [existsResolve](functions/existsResolve.md)                       | Resolve a path candidate with common TS/Vue extensions and index files.                                                                                  |
| [externalRoot](functions/externalRoot.md)                         | npm package root for a bare specifier (`stripe`, `@scope/pkg`).                                                                                          |
| [findMonorepoRoot](functions/findMonorepoRoot.md)                 | Walk up from `fromDir` until a package.json with a `workspaces` field is found.                                                                          |
| [resolvePackageExportPath](functions/resolvePackageExportPath.md) | Resolve a package export subpath to an absolute file path (no extension probing).                                                                        |
| [resolveSpecifier](functions/resolveSpecifier.md)                 | Resolve an import specifier relative to `fromFile` against the package index. Returns a workspace file, an external root, or null (unresolved relative). |

## References

### matchExportPattern

Re-exports [matchExportPattern](../../index/functions/matchExportPattern.md)

---

### sortExportPatternKeys

Re-exports [sortExportPatternKeys](../../index/functions/sortExportPatternKeys.md)
