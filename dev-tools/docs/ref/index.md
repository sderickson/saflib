**@saflib/dev-tools**

***

# @saflib/dev-tools

Set of utilities for workspace packages.

## Interfaces

<table>
<thead>
<tr>
<th>Interface</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[MonorepoContext](interfaces/MonorepoContext.md)

</td>
<td>

For tools which need to work across the monorepo. Use `buildMonorepoContext` to
get an instance of this. Package names are used as keys throughout.

Often used by other functions, on the assumption the consumer will create it once
and pass it around.

</td>
</tr>
<tr>
<td>

[MonorepoPackageDirectories](interfaces/MonorepoPackageDirectories.md)

</td>
<td>

Absolute paths.

</td>
</tr>
<tr>
<td>

[MonorepoPackageJsons](interfaces/MonorepoPackageJsons.md)

</td>
<td>

Raw package.json files.

</td>
</tr>
<tr>
<td>

[PackageJson](interfaces/PackageJson.md)

</td>
<td>

Interface of package.json fields which are used in this package.

See [NPM docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
for more information.

</td>
</tr>
<tr>
<td>

[WorkspaceDependencyGraph](interfaces/WorkspaceDependencyGraph.md)

</td>
<td>

Lists of direct "@saflib/*" dependencies.

</td>
</tr>
</tbody>
</table>

## Functions

<table>
<thead>
<tr>
<th>Function</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

[buildMonorepoContext](functions/buildMonorepoContext.md)

</td>
<td>

Creates a MonorepoContext. If no rootdir is provided, it will find the first
parent directory with a package-lock.json and use that as the root, effectively
returning "this" package's monorepo context.

</td>
</tr>
<tr>
<td>

[getAllPackageWorkspaceDependencies](functions/getAllPackageWorkspaceDependencies.md)

</td>
<td>

Returns all direct and transitive "@saflib/*" dependencies for a given package.

</td>
</tr>
<tr>
<td>

[getCurrentPackageName](functions/getCurrentPackageName.md)

</td>
<td>

Finds the name of the package for the current working directory.

</td>
</tr>
</tbody>
</table>
