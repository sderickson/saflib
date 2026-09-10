[**@saflib/monorepo**](../../../index.md)

---

# Interface: PackageJsonLayoutFields

In-memory package.json fields used by layout checks.

## Extends

- [`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md)

## Properties

### bin?

> `optional` **bin**: `string` \| `Record`\<`string`, `string`>\>

---

### dependencies?

> `optional` **dependencies**: `Record`\<`string`, `string`>\>

#### Inherited from

[`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md).[`dependencies`](../../package-kind/interfaces/SafPackageJson.md#dependencies)

---

### exports?

> `optional` **exports**: `Record`\<`string`, `unknown`>\>

Subpath exports map (`"./foo": "./foo.ts"`).

#### Overrides

[`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md).[`exports`](../../package-kind/interfaces/SafPackageJson.md#exports)

---

### imports?

> `optional` **imports**: `Record`\<`string`, `unknown`>\>

Package-local `#` imports map (`"#foo.ts": "./foo.ts"`).

---

### name?

> `optional` **name**: `string`

#### Inherited from

[`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md).[`name`](../../package-kind/interfaces/SafPackageJson.md#name)

---

### optionalDependencies?

> `optional` **optionalDependencies**: `Record`\<`string`, `string`>\>

#### Inherited from

[`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md).[`optionalDependencies`](../../package-kind/interfaces/SafPackageJson.md#optionaldependencies)

---

### saf?

> `optional` **saf**: `object`

#### kind?

> `optional` **kind**: `unknown`

#### Inherited from

[`SafPackageJson`](../../package-kind/interfaces/SafPackageJson.md).[`saf`](../../package-kind/interfaces/SafPackageJson.md#saf)

---

### scripts?

> `optional` **scripts**: `Record`\<`string`, `string`>\>
