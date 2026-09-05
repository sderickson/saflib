[**@saflib/imports**](../../index.md)

---

# Class: MemoryFactStore

In-memory FactStore for workdir / CI (no SQLite).

## Implements

- [`FactStore`](../interfaces/FactStore.md)

## Constructors

### Constructor

> **new MemoryFactStore**(): `MemoryFactStore`

#### Returns

`MemoryFactStore`

## Methods

### ensureFromSource()

> **ensureFromSource**(`contentKey`, `source`): `Promise`\<[`FileFact`](../interfaces/FileFact.md)>\>

Parse source and store under contentKey; returns the fact.

#### Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `contentKey` | `string` |
| `source`     | `string` |

#### Returns

`Promise`\<[`FileFact`](../interfaces/FileFact.md)\>

---

### get()

> **get**(`contentKeys`): `Promise`\<`Map`\<`string`, [`FileFact`](../interfaces/FileFact.md)>>\>\>

#### Parameters

| Parameter     | Type       |
| ------------- | ---------- |
| `contentKeys` | `string`[] |

#### Returns

`Promise`\<`Map`\<`string`, [`FileFact`](../interfaces/FileFact.md)\>\>

#### Implementation of

[`FactStore`](../interfaces/FactStore.md).[`get`](../interfaces/FactStore.md#get)

---

### put()

> **put**(`facts`): `Promise`\<`void`>\>

#### Parameters

| Parameter | Type                                      |
| --------- | ----------------------------------------- |
| `facts`   | [`FileFact`](../interfaces/FileFact.md)[] |

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`FactStore`](../interfaces/FactStore.md).[`put`](../interfaces/FactStore.md#put)
