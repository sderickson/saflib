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

The input for the step, based on the context for the invoking workflow.

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

The state machine for the step. Either a core step or a workflow definition which has been converted to a state machine with `makeWorkflowMachine`.

---

### skipIf()

> **skipIf**: (`arg`) => `boolean`

A function that determines if the step should be skipped.

#### Parameters

| Parameter     | Type                                      |
| ------------- | ----------------------------------------- |
| `arg`         | \{ `context`: `C` & `WorkflowContext`; \} |
| `arg.context` | `C` & `WorkflowContext`                   |

#### Returns

`boolean`

---

### validate()

> **validate**: (`arg`) => `Promise`\<`string` \| `undefined`\>

A function that validates the step after it has been executed. If it returns a string, that string is prompted to the agent and the workflow is kept from moving forward until the validate function returns undefined.

#### Parameters

| Parameter     | Type                                      |
| ------------- | ----------------------------------------- |
| `arg`         | \{ `context`: `C` & `WorkflowContext`; \} |
| `arg.context` | `C` & `WorkflowContext`                   |

#### Returns

`Promise`\<`string` \| `undefined`\>
