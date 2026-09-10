[**@saflib/workflows**](../index.md)

---

# Interface: CopyStepInput

Input for the CopyStepMachine.

## Properties

### flags?

> `optional` **flags**: `Record`\<`string`, `boolean`>\>

Optional flags for workflow area conditionals (e.g. IF upload).
Passed to template resolution so that BEGIN...IF flag...ELSE...END areas choose the correct branch.

---

### lineReplace()?

> `optional` **lineReplace**: (`line`) => `string`

Optional argument to do custom string transformations of template files and paths.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `line`    | `string` |

#### Returns

`string`

---

### name?

> `optional` **name**: `string`

kebab-case name of the thing being created from the template. Will be used to query replace instances of "template-file" and other variants like templateFile and template_file, though this behavior is deprecated and it's recommended to use the `lineReplace` function instead.

---

### skipSourceGlobs?

> `optional` **skipSourceGlobs**: `string`[]

When walking directory template sources, skip files matching these
minimatch globs (matched against the absolute path with `/` separators).
Always combined with built-in skips for node_modules, dist, etc.

Example (product/init): globs that match paths containing `__…__` segments
so expansion stubs stay in the golden product only.

---

### skipSourcePath()?

> `optional` **skipSourcePath**: (`fullPath`) => `boolean`

When walking directory template sources, skip files whose absolute path
returns true. Prefer [skipSourceGlobs](#skipsourceglobs) when a pattern is enough.

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `fullPath` | `string` |

#### Returns

`boolean`

---

### skipUnlessPathExists?

> `optional` **skipUnlessPathExists**: `string`

When set, skip the entire copy step if this path does not exist (resolved
relative to the workflow cwd unless absolute). Useful when parent weave
targets are optional (e.g. standalone saflib packages with no product spec).

---

### targetDir

> **targetDir**: `string`

Absolute path to the directory where the updated copies of the template files will go.
