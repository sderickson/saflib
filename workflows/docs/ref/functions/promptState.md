[**@saflib/workflows**](../index.md)

***

# Function: promptState()

> **promptState**\<`C`\>(`promptForContext`, `target`): `object`

## Type Parameters

| Type Parameter |
| ------ |
| `C` *extends* [`WorkflowContext`](../interfaces/WorkflowContext.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `promptForContext` | (`__namedParameters`) => `string` |
| `target` | `string` |

## Returns

`object`

### entry

> **entry**: `ActionFunction`\<`MachineContext`, `EventObject`, `EventObject`, `NonReducibleUnknown`, `never`, `never`, `never`, `never`, `never`\>

### on

> **on**: `object`

#### on.continue

> **continue**: `object`

#### on.continue.target

> **target**: `string`

#### on.prompt

> **prompt**: `object`

#### on.prompt.actions

> **actions**: `object`[]
