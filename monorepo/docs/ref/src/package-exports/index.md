[**@saflib/monorepo**](../../index.md)

---

# src/package-exports

## Interfaces

| Interface                                                      | Description |
| -------------------------------------------------------------- | ----------- |
| [ExportModulePathLayout](interfaces/ExportModulePathLayout.md) | -           |

## Functions

| Function                                                                            | Description                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [exportGlobForTopLevelSegment](functions/exportGlobForTopLevelSegment.md)           | -                                                                                                                                                                                             |
| [prepareNewPackageExports](functions/prepareNewPackageExports.md)                   | -                                                                                                                                                                                             |
| [resolveExportModulePathLayout](functions/resolveExportModulePathLayout.md)         | Validates an export module path from parsePath and returns how to upsert `package.json` exports (glob on the first folder segment, or an explicit `./stem` entry for allowlisted root files). |
| [stripTemplateExportPlaceholders](functions/stripTemplateExportPlaceholders.md)     | Remove template placeholder export keys/values (e.g. `./__group-name__/*`).                                                                                                                   |
| [upsertExplicitExport](functions/upsertExplicitExport.md)                           | -                                                                                                                                                                                             |
| [upsertExportGlob](functions/upsertExportGlob.md)                                   | -                                                                                                                                                                                             |
| [upsertPackageExportForModule](functions/upsertPackageExportForModule.md)           | -                                                                                                                                                                                             |
| [upsertPackageJsonExportsForModule](functions/upsertPackageJsonExportsForModule.md) | -                                                                                                                                                                                             |

## References

### importGlobForTopLevelSegment

Re-exports [importGlobForTopLevelSegment](../../index/functions/importGlobForTopLevelSegment.md)

---

### importsFromExports

Re-exports [importsFromExports](../../index/functions/importsFromExports.md)

---

### ROOT\_IMPORT\_CATCHALL

Re-exports [ROOT_IMPORT_CATCHALL](../../index/variables/ROOT_IMPORT_CATCHALL.md)

---

### stripTemplateImportPlaceholders

Re-exports [stripTemplateImportPlaceholders](../../index/functions/stripTemplateImportPlaceholders.md)

---

### upsertImportGlob

Re-exports [upsertImportGlob](../../index/functions/upsertImportGlob.md)
