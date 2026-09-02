[**@saflib/object-store**](../index.md)

---

# Class: DiskObjectStore

## Extends

- [`ObjectStore`](ObjectStore.md)

## Constructors

### Constructor

> **new DiskObjectStore**(`rootPath`): `DiskObjectStore`

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `rootPath` | `string` |

#### Returns

`DiskObjectStore`

#### Overrides

[`ObjectStore`](ObjectStore.md).[`constructor`](ObjectStore.md#constructor)

## Methods

### deleteFile()

> **deleteFile**(`relativePath`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter      | Type     |
| -------------- | -------- |
| `relativePath` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`deleteFile`](ObjectStore.md#deletefile)

---

### getScopedPath()

> `protected` **getScopedPath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`getScopedPath`](ObjectStore.md#getscopedpath)

---

### listFiles()

> **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[], [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[], [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`listFiles`](ObjectStore.md#listfiles)

---

### normalizePath()

> `protected` **normalizePath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`normalizePath`](ObjectStore.md#normalizepath)

---

### readFile()

> **readFile**(`relativePath`): `Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

#### Parameters

| Parameter      | Type     |
| -------------- | -------- |
| `relativePath` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`readFile`](ObjectStore.md#readfile)

---

### uploadFile()

> **uploadFile**(`relativePath`, `stream`, `_metadata?`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter      | Type                           |
| -------------- | ------------------------------ |
| `relativePath` | `string`                       |
| `stream`       | `Readable`                     |
| `_metadata?`   | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

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

> `protected` **validatePath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`validatePath`](ObjectStore.md#validatepath)
