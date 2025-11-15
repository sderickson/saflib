[**@saflib/workflows**](../index.md)

---

# Function: runWorkflow()

> **runWorkflow**(`options`): `Promise`\<[`RunWorkflowResult`](../interfaces/RunWorkflowResult.md)\>

Convenience function to take a WorkflowDefinition, run it in the specified mode, and return the output.
Can be used to run a given workflow in checklist mode for a unit test. This is also used internally
by the CLI tool.

## Parameters

| Parameter | Type                                                        |
| --------- | ----------------------------------------------------------- |
| `options` | [`RunWorkflowOptions`](../interfaces/RunWorkflowOptions.md) |

## Returns

`Promise`\<[`RunWorkflowResult`](../interfaces/RunWorkflowResult.md)\>
