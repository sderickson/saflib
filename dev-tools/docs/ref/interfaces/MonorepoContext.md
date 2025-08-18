[**@saflib/dev-tools**](../index.md)

***

# Interface: MonorepoContext

Defined in: [src/workspace.ts:33](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L33)

For tools which need to work across the monorepo. Use `buildMonorepoContext` to
get an instance of this. Package names are used as keys throughout.

Often used by other functions, on the assumption the consumer will create it once
and pass it around.

## Properties

### monorepoPackageDirectories

> **monorepoPackageDirectories**: [`MonorepoPackageDirectories`](MonorepoPackageDirectories.md)

Defined in: [src/workspace.ts:41](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L41)

***

### monorepoPackageJsons

> **monorepoPackageJsons**: [`MonorepoPackageJsons`](MonorepoPackageJsons.md)

Defined in: [src/workspace.ts:39](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L39)

***

### packages

> **packages**: `Set`\<`string`\>

Defined in: [src/workspace.ts:38](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L38)

***

### packagesWithDockerfileTemplates

> **packagesWithDockerfileTemplates**: `Set`\<`string`\>

Defined in: [src/workspace.ts:45](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L45)

Subset of packages for quickly finding those which produce Docker images.

***

### rootDir

> **rootDir**: `string`

Defined in: [src/workspace.ts:37](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L37)

Absolute path.

***

### workspaceDependencyGraph

> **workspaceDependencyGraph**: [`WorkspaceDependencyGraph`](WorkspaceDependencyGraph.md)

Defined in: [src/workspace.ts:40](https://github.com/sderickson/saflib/blob/93787f8fa8958c7d8341f08515302a77bc550495/dev-tools/src/workspace.ts#L40)
