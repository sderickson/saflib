[**@saflib/workflows**](../index.md)

---

# Function: copyTemplateStateComposer()

> **copyTemplateStateComposer**(`options`): [`XStateMachineStates`](../interfaces/XStateMachineStates.md)

Composer for copying template files to a target directory. Also replaces every
instance "template-file", "template_file", "TemplateFile", and "templateFile"
with the name of the thing being created, passed in via the CLI or other interface.
To use this composer, the machine context must extend TemplateWorkflowContext.

## Parameters

| Parameter | Type                                                                  |
| --------- | --------------------------------------------------------------------- |
| `options` | [`ComposerFunctionOptions`](../interfaces/ComposerFunctionOptions.md) |

## Returns

[`XStateMachineStates`](../interfaces/XStateMachineStates.md)
