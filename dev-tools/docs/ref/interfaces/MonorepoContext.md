[**@saflib/dev-tools**](../index.md)

---

# Interface: MonorepoContext

For tools which need to work across the monorepo. Use `buildMonorepoContext` to
get an instance of this. Package names are used as keys throughout.

Often used by other functions, on the assumption the consumer will create it once
and pass it around.

## Properties

### monorepoPackageDirectories

> **monorepoPackageDirectories**: [`MonorepoPackageDirectories`](MonorepoPackageDirectories.md)

---

### monorepoPackageJsons

> **monorepoPackageJsons**: [`MonorepoPackageJsons`](MonorepoPackageJsons.md)

---

### packages

> **packages**: `Set`\<`string`\>

---

### packagesWithDockerfileTemplates

> **packagesWithDockerfileTemplates**: `Set`\<`string`\>

Subset of packages for quickly finding those which produce Docker images.

---

### rootDir

> **rootDir**: `string`

Absolute path.

---

### workspaceDependencyGraph

> **workspaceDependencyGraph**: [`WorkspaceDependencyGraph`](WorkspaceDependencyGraph.md)
