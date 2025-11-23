[**@saflib/workflows**](../index.md)

---

# Interface: ParsePathInput

Argument for the parsePath function.

## Properties

### cwd

> **cwd**: `string`

The current working directory. Used to determine the target directory as an absolute path.

---

### requiredPrefix?

> `optional` **requiredPrefix**: `string`

The required prefix to enforce on the path. Must start with "./".
Whatever is specified here will not be included in the groupName or targetName.
Example: "./queries/"

---

### requiredSuffix?

> `optional` **requiredSuffix**: `string`

The required suffix to enforce on the path.
Must start with ".".
