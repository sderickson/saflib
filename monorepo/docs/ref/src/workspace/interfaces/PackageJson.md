[**@saflib/monorepo**](../../../index.md)

---

# Interface: PackageJson

Interface of package.json fields which are used in workspace discovery.

## Properties

### bin?

> `optional` **bin**: `Record`\<`string`, `string`\>

---

### dependencies?

> `optional` **dependencies**: `Record`\<`string`, `string`\>

---

### description?

> `optional` **description**: `string`

---

### devDependencies?

> `optional` **devDependencies**: `Record`\<`string`, `string`\>

---

### engines?

> `optional` **engines**: `Record`\<`string`, `string`\>

---

### exports?

> `optional` **exports**: `Record`\<`string`, `string`\>

---

### name

> **name**: `string`

---

### optionalDependencies?

> `optional` **optionalDependencies**: `Record`\<`string`, `string`\>

---

### overrides?

> `optional` **overrides**: `Record`\<`string`, `string`\>

---

### private?

> `optional` **private**: `boolean`

---

### saf?

> `optional` **saf**: `object`

SAF package metadata (`kind` is db / http / spec / sdk / spa / lib / …).

#### envExtends?

> `optional` **envExtends**: `string`[]

#### kind?

> `optional` **kind**: `string`

---

### scripts?

> `optional` **scripts**: `Record`\<`string`, `string`\>

---

### type?

> `optional` **type**: `string`

---

### version?

> `optional` **version**: `string`

---

### workspaces?

> `optional` **workspaces**: `string`[]
