[**@saflib/object-store**](../index.md)

---

# Abstract Class: ObjectStore

## Extended by

- [`AzureObjectStore`](AzureObjectStore.md)

## Constructors

### Constructor

> **new ObjectStore**(`containerName`, `folderPath`, `tier`): `ObjectStore`

#### Parameters

| Parameter       | Type         | Default value |
| --------------- | ------------ | ------------- |
| `containerName` | `string`     | `undefined`   |
| `folderPath`    | `string`     | `""`          |
| `tier`          | `AccessTier` | `"Hot"`       |

#### Returns

`ObjectStore`

## Properties

### containerName

> `protected` `readonly` **containerName**: `string`

---

### folderPath

> `protected` `readonly` **folderPath**: `string`

---

### tier

> `protected` `readonly` **tier**: `AccessTier`

## Methods

### deleteFile()

> `abstract` **deleteFile**(`path`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; \}\>\>

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

> `abstract` **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[]\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[]\>\>

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

> `abstract` **readFile**(`path`): `Promise`\<`ReturnsError`\<`Readable`\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`\>\>

---

### uploadFile()

> `abstract` **uploadFile**(`path`, `stream`, `metadata?`): `Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}\>\>

#### Parameters

| Parameter   | Type                           |
| ----------- | ------------------------------ |
| `path`      | `string`                       |
| `stream`    | `Readable`                     |
| `metadata?` | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`ReturnsError`\<\{ `success`: `boolean`; `url?`: `string`; \}\>\>

---

### validatePath()

> `protected` **validatePath**(`path`): `string`

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`string`
