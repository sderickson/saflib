[**@saflib/monorepo**](../../index.md)

---

# src/package-layout

## Interfaces

| Interface                                                                                | Description                                          |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [CheckPackageLayoutFromInputsOptions](interfaces/CheckPackageLayoutFromInputsOptions.md) | -                                                    |
| [CheckPackageLayoutOptions](interfaces/CheckPackageLayoutOptions.md)                     | -                                                    |
| [PackageJsonLayoutFields](interfaces/PackageJsonLayoutFields.md)                         | In-memory package.json fields used by layout checks. |
| [PackageLayoutIssue](interfaces/PackageLayoutIssue.md)                                   | -                                                    |

## Type Aliases

| Type Alias                                                       | Description |
| ---------------------------------------------------------------- | ----------- |
| [PackageLayoutIssueKind](type-aliases/PackageLayoutIssueKind.md) | -           |

## Variables

| Variable                                                          | Description                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [DEFAULT_MAX_SOURCE_LINES](variables/DEFAULT_MAX_SOURCE_LINES.md) | -                                                                                                                                                                                                                          |
| [ROOT_TS_ALLOWLIST](variables/ROOT_TS_ALLOWLIST.md)               | `.ts` / `.tsx` basenames always allowed at the package root. Everything else should live in a thematic folder — unless it is a direct package export target (see [isAllowedRootTsFile](functions/isAllowedRootTsFile.md)). |

## Functions

| Function                                                                          | Description                                                                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [checkPackageLayout](functions/checkPackageLayout.md)                             | Check bin/scripts layout conventions, no root-level TS, and oversized files.                                                          |
| [checkPackageLayoutFromInputs](functions/checkPackageLayoutFromInputs.md)         | Layout + oversized checks from already-loaded inputs (git commit / FS).                                                               |
| [isAllowedRootTsFile](functions/isAllowedRootTsFile.md)                           | Root source file is allowed when allowlisted, or when `package.json` exports it (`"."` → `./main.ts`, or `./<stem>` → `./<stem>.ts`). |
| [listPackageJsonExportTargetFiles](functions/listPackageJsonExportTargetFiles.md) | Concrete `package.json` `exports` file targets (`main.ts`, `test-app.ts`). Skips glob remaps (`./foo/*`).                             |
