[**@saflib/monorepo**](../../index.md)

---

# src/workspace

## Interfaces

| Interface                                                              | Description                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [MonorepoContext](interfaces/MonorepoContext.md)                       | For tools which need to work across the monorepo. Use `buildMonorepoContext` to get an instance of this. Package names are used as keys throughout. |
| [MonorepoPackageDirectories](interfaces/MonorepoPackageDirectories.md) | Absolute paths.                                                                                                                                     |
| [MonorepoPackageJsons](interfaces/MonorepoPackageJsons.md)             | Raw package.json files.                                                                                                                             |
| [PackageJson](interfaces/PackageJson.md)                               | Interface of package.json fields which are used in workspace discovery.                                                                             |
| [WorkspaceDependencyGraph](interfaces/WorkspaceDependencyGraph.md)     | Lists of direct "@saflib/*" dependencies.                                                                                                           |

## Type Aliases

| Type Alias                                     | Description |
| ---------------------------------------------- | ----------- |
| [directoryPath](type-aliases/directoryPath.md) | -           |
| [packageName](type-aliases/packageName.md)     | -           |

## Functions

| Function                                                                                | Description                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [buildMonorepoContext](functions/buildMonorepoContext.md)                               | Creates a MonorepoContext. If no rootdir is provided, it will find the first parent directory with a package-lock.json and use that as the root, effectively returning "this" package's monorepo context. |
| [buildWorkspaceDependencyGraph](functions/buildWorkspaceDependencyGraph.md)             | Not for public use.                                                                                                                                                                                       |
| [findPackagesWithDockerfileTemplates](functions/findPackagesWithDockerfileTemplates.md) | Not for public use.                                                                                                                                                                                       |
| [getAllPackageWorkspaceDependencies](functions/getAllPackageWorkspaceDependencies.md)   | Returns all direct and transitive "@saflib/*" dependencies for a given package.                                                                                                                           |
| [getCurrentPackageName](functions/getCurrentPackageName.md)                             | Finds the name of the package for the current working directory.                                                                                                                                          |
| [getMonorepoPackages](functions/getMonorepoPackages.md)                                 | Not for public use. Helper function for `buildMonorepoContext`.                                                                                                                                           |
