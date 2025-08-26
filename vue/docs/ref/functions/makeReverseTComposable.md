[**@saflib/vue**](../index.md)

***

# Function: makeReverseTComposable()

> **makeReverseTComposable**(`strings`): () => `object`

## Parameters

| Parameter | Type |
| ------ | ------ |
| `strings` | [`I18nMessages`](../interfaces/I18nMessages.md) |

## Returns

> (): `object`

### Returns

`object`

#### lookupTKey()

> **lookupTKey**: (`s`) => `string`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

##### Returns

`string`

#### t()

> **t**: \{(`s`): `string`; (`s`): [`I18NObject`](../interfaces/I18NObject.md); \} = `wrappedT`

##### Call Signature

> (`s`): `string`

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | `string` |

###### Returns

`string`

##### Call Signature

> (`s`): [`I18NObject`](../interfaces/I18NObject.md)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `s` | [`I18NObject`](../interfaces/I18NObject.md) |

###### Returns

[`I18NObject`](../interfaces/I18NObject.md)

#### tObject()

> **tObject**: (`o`) => [`I18NObject`](../interfaces/I18NObject.md)

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `o` | [`I18NObject`](../interfaces/I18NObject.md) |

##### Returns

[`I18NObject`](../interfaces/I18NObject.md)
