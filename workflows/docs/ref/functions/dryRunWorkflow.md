[**@saflib/workflows**](../index.md)

***

# Function: dryRunWorkflow()

> **dryRunWorkflow**(`definition`): `Promise`\<[`WorkflowOutput`](../interfaces/WorkflowOutput.md)\>

Convenience function to take a ConcretWorkflowRunner, dry run it, and return the output. The output in particular includes the checklist.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `definition` | [`WorkflowDefinition`](../interfaces/WorkflowDefinition.md)\<`any`, `any`\> |

## Returns

`Promise`\<[`WorkflowOutput`](../interfaces/WorkflowOutput.md)\>
