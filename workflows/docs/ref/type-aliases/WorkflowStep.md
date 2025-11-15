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

| Parameter     | Type                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| `arg`         | \{ `context`: `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md); \} |
| `arg.context` | `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md)                   |

#### Returns

`InputFrom`\<`M`\>

---

### machine

> **machine**: `M`

---

### skipIf()

> **skipIf**: (`arg`) => `boolean`

#### Parameters

| Parameter     | Type                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| `arg`         | \{ `context`: `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md); \} |
| `arg.context` | `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md)                   |

#### Returns

`boolean`

---

### validate()

> **validate**: (`arg`) => `Promise`\<`string` \| `undefined`\>

#### Parameters

| Parameter     | Type                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| `arg`         | \{ `context`: `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md); \} |
| `arg.context` | `C` & [`WorkflowContext`](../interfaces/WorkflowContext.md)                   |

#### Returns

`Promise`\<`string` \| `undefined`\>
