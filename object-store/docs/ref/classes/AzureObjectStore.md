[**@saflib/object-store**](../index.md)

---

# Class: AzureObjectStore

## Extends

- [`ObjectStore`](ObjectStore.md)

## Constructors

### Constructor

> **new AzureObjectStore**(`containerName`, `folderPath`, `tier`): `AzureObjectStore`

#### Parameters

| Parameter       | Type         | Default value |
| --------------- | ------------ | ------------- |
| `containerName` | `string`     | `undefined`   |
| `folderPath`    | `string`     | `""`          |
| `tier`          | `AccessTier` | `"Hot"`       |

#### Returns

`AzureObjectStore`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`constructor`](ObjectStore.md#constructor)

## Properties

### containerName

> `protected` `readonly` **containerName**: `string`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`containerName`](ObjectStore.md#containername)

---

### folderPath

> `protected` `readonly` **folderPath**: `string`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`folderPath`](ObjectStore.md#folderpath)

---

### tier

> `protected` `readonly` **tier**: `AccessTier`

#### Inherited from

[`ObjectStore`](ObjectStore.md).[`tier`](ObjectStore.md#tier)

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

> **listFiles**(`prefix?`): `Promise`\<`ReturnsError`\<`object`[]\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `prefix?` | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`object`[]\>\>

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

> **readFile**(`path`): `Promise`\<`ReturnsError`\<`Readable`\>\>

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `path`    | `string` |

#### Returns

`Promise`\<`ReturnsError`\<`Readable`\>\>

#### Overrides

[`ObjectStore`](ObjectStore.md).[`readFile`](ObjectStore.md#readfile)

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

[`ObjectStore`](ObjectStore.md).[`uploadFile`](ObjectStore.md#uploadfile)

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
