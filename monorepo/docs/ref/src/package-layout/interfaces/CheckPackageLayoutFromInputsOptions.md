[**@saflib/monorepo**](../../../index.md)

---

# Interface: CheckPackageLayoutFromInputsOptions

## Properties

### maxSourceLines?

> `optional` **maxSourceLines**: `number`

---

### packageDirBasename?

> `optional` **packageDirBasename**: `string`

Basename used when `bin` is a string (defaults to `"package"`).

---

### packageJson

> **packageJson**: [`PackageJsonLayoutFields`](PackageJsonLayoutFields.md)

---

### packageRepoPath?

> `optional` **packageRepoPath**: `string`

Repo-relative package directory for repoPath (optional).

---

### rootTsFiles?

> `optional` **rootTsFiles**: `string`[]

Filenames of .ts/.tsx at package root (not nested).

---

### sourceFiles?

> `optional` **sourceFiles**: `object`[]

Prod source files with line counts (package-local paths; `.ts`/`.tsx`/`.yaml`/`.yml`).

#### lineCount

> **lineCount**: `number`

#### localPath

> **localPath**: `string`
