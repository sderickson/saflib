[**@saflib/vue**](../../../index.md)

***

# Function: makeReverseTComposable()

> **makeReverseTComposable**(`strings`): () => `object`

Creates an alternative to Vue I18n's $t function, which takes the English text instead of a key. This is mainly so TypeScript enforces that keys are translated to strings.

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
