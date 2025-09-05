[**@saflib/workflows**](../index.md)

---

# Type Alias: WorkflowStep\<C, M\>

> **WorkflowStep**\<`C`, `M`\> = `object`

A step in a workflow with an actor and its corresponding input.

## Type Parameters

| Type Parameter                  |
| ------------------------------- |
| `C`                             |
| `M` _extends_ `AnyStateMachine` |

## Properties

### input()

> **input**: (`arg`) => `InputFrom`\<`M`\>

#### Parameters

| Parameter     | Type                                      |
| ------------- | ----------------------------------------- |
| `arg`         | \{ `context`: `C` & `WorkflowContext`; \} |
| `arg.context` | `C` & `WorkflowContext`                   |

#### Returns

`InputFrom`\<`M`\>

---

### machine

> **machine**: `M`
