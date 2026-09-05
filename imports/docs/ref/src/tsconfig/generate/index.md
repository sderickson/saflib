[**@saflib/imports**](../../../index.md)

---

# src/tsconfig/generate

## Interfaces

| Interface                                                            | Description |
| -------------------------------------------------------------------- | ----------- |
| [CheckReferencesResult](interfaces/CheckReferencesResult.md)         | -           |
| [GenerateReferencesPreview](interfaces/GenerateReferencesPreview.md) | -           |
| [PackageReferencePreview](interfaces/PackageReferencePreview.md)     | -           |
| [ReferenceDrift](interfaces/ReferenceDrift.md)                       | -           |
| [SolutionReferencePreview](interfaces/SolutionReferencePreview.md)   | -           |

## Functions

| Function                                                            | Description                                                                                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [checkReferences](functions/checkReferences.md)                     | Diff on-disk tsconfigs against the generator; also fails when the reference graph contains cycles.                                           |
| [computeSolutions](functions/computeSolutions.md)                   | Compute solution-style root configs for the given monorepo scope.                                                                            |
| [ensurePackageEmitOptions](functions/ensurePackageEmitOptions.md)   | Ensure per-package emit paths and strip legacy noEmit overrides.                                                                             |
| [generateReferences](functions/generateReferences.md)               | Alias used by callers that want an explicit generate entrypoint.                                                                             |
| [isWorkflowTemplatePackage](functions/isWorkflowTemplatePackage.md) | Workflow scaffold packages are workspace members but should not appear in solution roots (they're templates, not shipped compilation units). |
| [previewReferencesGenerate](functions/previewReferencesGenerate.md) | Preview (and optionally write) project-reference arrays for each package tsconfig plus solution-style root configs.                          |
