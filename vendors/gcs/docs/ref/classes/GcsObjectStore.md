[**@saflib/vendors-gcs**](../index.md)

---

# Class: GcsObjectStore

## Extends

- `ObjectStore`

## Constructors

### Constructor

> **new GcsObjectStore**(`options`): `GcsObjectStore`

#### Parameters

| Parameter | Type                                                              |
| --------- | ----------------------------------------------------------------- |
| `options` | [`GcsObjectStoreOptions`](../interfaces/GcsObjectStoreOptions.md) |

#### Returns

`GcsObjectStore`

#### Overrides

`ObjectStore.constructor`

## Properties

### bucketName

> `protected` `readonly` **bucketName**: `string`

## Methods

### deleteFile()

> **deleteFile**(`path`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}\>\>

#### Overrides

`ObjectStore.deleteFile`

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

`ObjectStore.getScopedPath`

---

### listFiles()

> **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[]\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[]\>\>

#### Overrides

`ObjectStore.listFiles`

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

`ObjectStore.normalizePath`

---

### readFile()

> **readFile**(`path`): `Promise`\<`ReturnsError`\<`Readable`>>\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`\>\>

#### Overrides

`ObjectStore.readFile`

---

### uploadFile()

> **uploadFile**(`path`, `stream`, `metadata?`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}\>\>

#### Parameters

| Parameter   | Type                           |
| ----------- | ------------------------------ |
| `path`      | `string`                       |
| `stream`    | `Readable`                     |
| `metadata?` | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}\>\>

#### Overrides

`ObjectStore.uploadFile`

---

### upsertContainer()

> **upsertContainer**(): `Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, `StorageError`>>\>\>

#### Returns

`Promise`\<`ReturnsError`\<\{ `created?`: `boolean`; `skipped?`: `boolean`; `success`: `boolean`; `updated?`: `boolean`; `url?`: `string`; \}, `StorageError`\>\>

#### Overrides

`ObjectStore.upsertContainer`

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

`ObjectStore.validatePath`
