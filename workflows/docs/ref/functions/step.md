[**@saflib/workflows**](../index.md)

---

# Function: step()

> **step**\<`C`, `M`\>(`machine`, `input`): [`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `M`\>

Helper function for defining a step in a workflow, enforcing types properly.

## Type Parameters

| Type Parameter                  |
| ------------------------------- |
| `C`                             |
| `M` _extends_ `AnyStateMachine` |

## Parameters

| Parameter | Type                          |
| --------- | ----------------------------- |
| `machine` | `M`                           |
| `input`   | (`arg`) => `InputFrom`\<`M`\> |

## Returns

[`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `M`\>
