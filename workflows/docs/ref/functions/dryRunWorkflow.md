[**@saflib/workflows**](../index.md)

---

# ~~Function: dryRunWorkflow()~~

> **dryRunWorkflow**(`definition`): `Promise`\<`undefined` \| [`WorkflowOutput`](../interfaces/WorkflowOutput.md)\>

Convenience function to take a WorkflowDefinition, dry run it, and return the output. The output in particular includes the checklist.

## Parameters

| Parameter    | Type                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| `definition` | [`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`any`, `any`\> |

## Returns

`Promise`\<`undefined` \| [`WorkflowOutput`](../interfaces/WorkflowOutput.md)\>

## Deprecated

Use runWorkflow with runMode: "dry" instead
