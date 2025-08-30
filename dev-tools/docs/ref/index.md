**@saflib/dev-tools**

---

# @saflib/dev-tools

Set of utilities for workspace packages.

## Interfaces

| Interface                                                              | Description                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MonorepoContext](interfaces/MonorepoContext.md)                       | For tools which need to work across the monorepo. Use `buildMonorepoContext` to get an instance of this. Package names are used as keys throughout. |
| [MonorepoPackageDirectories](interfaces/MonorepoPackageDirectories.md) | Absolute paths.                                                                                                                                     |
| [MonorepoPackageJsons](interfaces/MonorepoPackageJsons.md)             | Raw package.json files.                                                                                                                             |
| [PackageJson](interfaces/PackageJson.md)                               | Interface of package.json fields which are used in this package.                                                                                    |
| [WorkspaceDependencyGraph](interfaces/WorkspaceDependencyGraph.md)     | Lists of direct "@saflib/\*" dependencies.                                                                                                          |

## Functions

| Function                                                                              | Description                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [buildMonorepoContext](functions/buildMonorepoContext.md)                             | Creates a MonorepoContext. If no rootdir is provided, it will find the first parent directory with a package-lock.json and use that as the root, effectively returning "this" package's monorepo context. |
| [getAllPackageWorkspaceDependencies](functions/getAllPackageWorkspaceDependencies.md) | Returns all direct and transitive "@saflib/\*" dependencies for a given package.                                                                                                                          |
| [getCurrentPackageName](functions/getCurrentPackageName.md)                           | Finds the name of the package for the current working directory.                                                                                                                                          |
