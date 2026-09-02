[**@saflib/object-store**](../index.md)

---

# Abstract Class: ObjectStore

## Extended by

- [`DiskObjectStore`](DiskObjectStore.md)
- [`TestObjectStore`](TestObjectStore.md)

## Constructors

### Constructor

> **new ObjectStore**(): `ObjectStore`

#### Returns

`ObjectStore`

## Methods

### deleteFile()

> `abstract` **deleteFile**(`path`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

---

### getScopedPath()

> `protected` **getScopedPath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

---

### listFiles()

> `abstract` **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[], [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[], [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

---

### normalizePath()

> `protected` **normalizePath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`

---

### readFile()

> `abstract` **readFile**(`path`): `Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md) \| [`FileNotFoundError`](FileNotFoundError.md)\>\>

---

### uploadFile()

> `abstract` **uploadFile**(`path`, `stream`, `metadata?`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

#### Parameters

| Parameter   | Type                           |
| ----------- | ------------------------------ |
| `path`      | `string`                       |
| `stream`    | `Readable`                     |
| `metadata?` | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}, [`PathTraversalError`](PathTraversalError.md) \| [`StorageError`](StorageError.md)\>\>

---

### upsertContainer()

> `abstract` **upsertContainer**(): `Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

#### Returns

`Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, [`StorageError`](StorageError.md)\>\>

---

### validatePath()

> `protected` **validatePath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`
