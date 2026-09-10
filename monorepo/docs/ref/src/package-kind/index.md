[**@saflib/monorepo**](../../index.md)

---

# src/package-kind

## Interfaces

| Interface                                                            | Description |
| -------------------------------------------------------------------- | ----------- |
| [PackageKindClassification](interfaces/PackageKindClassification.md) | -           |
| [SafPackageJson](interfaces/SafPackageJson.md)                       | -           |

## Type Aliases

| Type Alias                                 | Description |
| ------------------------------------------ | ----------- |
| [PackageKind](type-aliases/PackageKind.md) | -           |

## Variables

| Variable                                                            | Description                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [PACKAGE\_KIND\_IDENTIFIERS](variables/PACKAGE_KIND_IDENTIFIERS.md) | Identifier packages that imply a product layer. The packages themselves are `lib`. |
| [PACKAGE\_KINDS](variables/PACKAGE_KINDS.md)                        | Product package kinds for inventory / layout.                                      |

## Functions

| Function                                                  | Description                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [classifySafPackage](functions/classifySafPackage.md)     | Classify a package from `saf.kind` and/or identifier dependencies. Does not read the filesystem. |
| [hasSdkRequestsExport](functions/hasSdkRequestsExport.md) | True when `package.json` `exports` includes a `./requests` subpath.                              |
| [isPackageKind](functions/isPackageKind.md)               | -                                                                                                |
| [parseSafPackageJson](functions/parseSafPackageJson.md)   | -                                                                                                |
