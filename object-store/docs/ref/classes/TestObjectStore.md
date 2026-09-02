[**@saflib/object-store**](../index.md)

---

# Class: TestObjectStore

In-memory ObjectStore for tests. Use setFiles/getFiles to seed or inspect
state when testing code that uses an ObjectStore.

## Extends

- [`ObjectStore`](ObjectStore.md)

## Constructors

### Constructor

> **new TestObjectStore**(): `TestObjectStore`

#### Returns

`TestObjectStore`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`constructor`](ObjectStore.md#constructor)

## Methods

### deleteFile()

> **deleteFile**(`path`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`deleteFile`](ObjectStore.md#deletefile)

---

### getFiles()

> **getFiles**(): [`TestFile`](../interfaces/TestFile.md)[]

#### Returns

[`TestFile`](../interfaces/TestFile.md)[]

---

### getScopedPath()

> **getScopedPath**(`path`): `string`

Exposed for tests that assert path behavior (ObjectStore.test.ts).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Overrides

[`ObjectStore`](ObjectStore.md).[`getScopedPath`](ObjectStore.md#getscopedpath)

---

### listFiles()

> **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[], [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[], [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`listFiles`](ObjectStore.md#listfiles)

---

### normalizePath()

> **normalizePath**(`path`): `string`

Exposed for tests that assert path behavior (ObjectStore.test.ts).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Overrides

[`ObjectStore`](ObjectStore.md).[`normalizePath`](ObjectStore.md#normalizepath)

---

### readFile()

> **readFile**(`path`): `Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`readFile`](ObjectStore.md#readfile)

---

### setFiles()

> **setFiles**(`files`): `void`

#### Parameters

| Parameter | Type                                      |
| --------- | ----------------------------------------- |
| `files`   | [`TestFile`](../interfaces/TestFile.md)[] |

#### Returns

`void`

---

### uploadFile()

> **uploadFile**(`path`, `stream`, `metadata?`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter   | Type                           |
| ----------- | ------------------------------ |
| `path`      | `string`                       |
| `stream`    | `Readable`                     |
| `metadata?` | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`uploadFile`](ObjectStore.md#uploadfile)

---

### upsertContainer()

> **upsertContainer**(): `Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

#### Returns

`Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`upsertContainer`](ObjectStore.md#upsertcontainer)

---

### validatePath()

> **validatePath**(`path`): `string`

Exposed for tests that assert path behavior (ObjectStore.test.ts).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Overrides

[`ObjectStore`](ObjectStore.md).[`validatePath`](ObjectStore.md#validatepath)
