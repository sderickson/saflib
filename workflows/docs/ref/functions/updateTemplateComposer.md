[**@saflib/workflows**](../index.md)

---

# Function: updateTemplateComposer()

> **updateTemplateComposer**\<`C`\>(`__namedParameters`): `object`

Composer for updating files copied by states from copyTemplateStateComposer.
Use this to provide specific instructions on how to update each file. In
addition to prompting the agent to make changes, this will block the agent
from continuing until all "todo" strings are gone from the file.

## Type Parameters

| Type Parameter                                                                      |
| ----------------------------------------------------------------------------------- |
| `C` _extends_ [`TemplateWorkflowContext`](../interfaces/TemplateWorkflowContext.md) |

## Parameters

| Parameter           | Type                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `__namedParameters` | [`UpdateTemplateFileComposerOptions`](../interfaces/UpdateTemplateFileComposerOptions.md)\<`C`\> |

## Returns

`object`
