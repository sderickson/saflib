[**@saflib/workflows**](../index.md)

***

# Function: promptAgent()

> **promptAgent**\<`C`, `E`\>(`cb`): `object`

Action builder for prompting the agent.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |
| `E` *extends* `AnyEventObject` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | `string` \| (`ctx`) => `string` |

## Returns

`object`

### params()

> **params**: (`event`) => `object`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `ActionParam`\<`C`, `E`\> |

#### Returns

`object`

##### msg

> **msg**: `string`

### type

> **type**: `"prompt"`
