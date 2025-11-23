[**@saflib/workflows**](../index.md)

---

# Function: step()

> **step**\<`C`, `M`\>(`machine`, `input`, `options`): [`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `M`\>

Helper function for defining a step in a workflow, enforcing types properly.

## Type Parameters

| Type Parameter                  |
| ------------------------------- |
| `C`                             |
| `M` _extends_ `AnyStateMachine` |

## Parameters

| Parameter           | Type                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `machine`           | `M`                                                                                                  |
| `input`             | (`arg`) => `InputFrom`\<`M`\>                                                                        |
| `options`           | \{ `skipIf?`: (`arg`) => `boolean`; `validate?`: (`arg`) => `Promise`\<`undefined` \| `string`\>; \} |
| `options.skipIf?`   | (`arg`) => `boolean`                                                                                 |
| `options.validate?` | (`arg`) => `Promise`\<`undefined` \| `string`\>                                                      |

## Returns

[`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `M`\>
