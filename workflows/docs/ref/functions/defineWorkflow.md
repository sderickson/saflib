[**@saflib/workflows**](../index.md)

---

# Function: defineWorkflow()

> **defineWorkflow**\<`I`, `C`\>(`config`): [`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`I`, `C`\>

Helper, identity function to infer types.

By using this function on a Workflow object, it properly types the input object in the context function, and the context in the callbacks for the steps.

I'm keeping this separate just because it's good to have the type inference piece separate where it can be messed with independently.

## Type Parameters

| Type Parameter                                                                   | Default type |
| -------------------------------------------------------------------------------- | ------------ |
| `I` _extends_ readonly [`WorkflowArgument`](../interfaces/WorkflowArgument.md)[] | -            |
| `C`                                                                              | `any`        |

## Parameters

| Parameter                      | Type                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`                       | \{ `checklistDescription?`: (`context`) => `string`; `context`: (`arg`) => `C`; `description`: `string`; `docFiles`: `Record`\<`string`, `string`\>; `id`: `string`; `input`: `I`; `sourceUrl`: `string`; `steps`: [`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `AnyStateMachine`\>[]; `templateFiles`: `Record`\<`string`, `string`\>; \} |
| `config.checklistDescription?` | (`context`) => `string`                                                                                                                                                                                                                                                                                                                               |
| `config.context`               | (`arg`) => `C`                                                                                                                                                                                                                                                                                                                                        |
| `config.description`           | `string`                                                                                                                                                                                                                                                                                                                                              |
| `config.docFiles`              | `Record`\<`string`, `string`\>                                                                                                                                                                                                                                                                                                                        |
| `config.id`                    | `string`                                                                                                                                                                                                                                                                                                                                              |
| `config.input`                 | `I`                                                                                                                                                                                                                                                                                                                                                   |
| `config.sourceUrl`             | `string`                                                                                                                                                                                                                                                                                                                                              |
| `config.steps`                 | [`WorkflowStep`](../type-aliases/WorkflowStep.md)\<`C`, `AnyStateMachine`\>[]                                                                                                                                                                                                                                                                         |
| `config.templateFiles`         | `Record`\<`string`, `string`\>                                                                                                                                                                                                                                                                                                                        |

## Returns

[`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`I`, `C`\>
