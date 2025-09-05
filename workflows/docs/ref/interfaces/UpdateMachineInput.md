[**@saflib/workflows**](../index.md)

***

# Interface: UpdateMachineInput

Input for the UpdateStepMachine.

## Properties

### fileId

> **fileId**: `string`

The id of the file the user is expected to update. Must match one of the keys in the `templateFiles` property for the workflow.

***

### promptMessage

> **promptMessage**: `string` \| (`context`) => `string`

The message to show to the user. The machine will then stop until the workflow is continued.
