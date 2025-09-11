[**@saflib/dev-tools**](../../index.md)

---

# @saflib/dev-tools

Set of utilities for workspace packages.

## Interfaces

| Interface                                                              | Description                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MonorepoContext](interfaces/MonorepoContext.md)                       | For tools which need to work across the monorepo. Use `buildMonorepoContext` to get an instance of this. Package names are used as keys throughout. |
| [MonorepoPackageDirectories](interfaces/MonorepoPackageDirectories.md) | Absolute paths.                                                                                                                                     |
| [MonorepoPackageJsons](interfaces/MonorepoPackageJsons.md)             | Raw package.json files.                                                                                                                             |
| [WorkspaceDependencyGraph](interfaces/WorkspaceDependencyGraph.md)     | Lists of direct "@saflib/\*" dependencies.                                                                                                          |

## Functions

| Function                                                                              | Description                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [buildMonorepoContext](functions/buildMonorepoContext.md)                             | Creates a MonorepoContext. If no rootdir is provided, it will find the first parent directory with a package-lock.json and use that as the root, effectively returning "this" package's monorepo context. |
| [getAllPackageWorkspaceDependencies](functions/getAllPackageWorkspaceDependencies.md) | Returns all direct and transitive "@saflib/\*" dependencies for a given package.                                                                                                                          |
| [getCurrentPackage](functions/getCurrentPackage.md)                                   | -                                                                                                                                                                                                         |
| [getCurrentPackageName](functions/getCurrentPackageName.md)                           | Finds the name of the package for the current working directory.                                                                                                                                          |
| [getGitHubUrl](functions/getGitHubUrl.md)                                             | -                                                                                                                                                                                                         |
| [getTopWorkflowDir](functions/getTopWorkflowDir.md)                                   | -                                                                                                                                                                                                         |

## References

### PackageJson

Re-exports [PackageJson](../../types/interfaces/PackageJson.md)
