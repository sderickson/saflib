[**@saflib/workflows**](../index.md)

***

# Function: step()

> **step**\<`C`, `M`\>(`machine`, `input`): [`Step`](../type-aliases/Step.md)\<`C`, `M`\>

Helper function for defining a step in a workflow, enforcing types properly.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |
| `M` *extends* `AnyStateMachine` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `machine` | `M` |
| `input` | (`arg`) => `InputFrom`\<`M`\> |

## Returns

[`Step`](../type-aliases/Step.md)\<`C`, `M`\>
