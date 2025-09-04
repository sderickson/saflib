[**@saflib/workflows**](../index.md)

***

# Type Alias: Step\<C, M\>

> **Step**\<`C`, `M`\> = `object`

A step in a workflow with an actor and its corresponding input.

## Type Parameters

| Type Parameter |
| ------ |
| `C` |
| `M` *extends* `AnyStateMachine` |

## Properties

### input()

> **input**: (`arg`) => `InputFrom`\<`M`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arg` | \{ `context`: `C` & `WorkflowContext`; \} |
| `arg.context` | `C` & `WorkflowContext` |

#### Returns

`InputFrom`\<`M`\>

***

### machine

> **machine**: `M`
