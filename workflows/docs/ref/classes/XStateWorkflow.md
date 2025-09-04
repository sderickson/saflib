[**@saflib/workflows**](../index.md)

***

# Abstract Class: XStateWorkflow

Abstract superclass for XStateWorkflows.

To use, subclass it with:

* machine - the XState machine for the workflow.
* sourceUrl - import.meta.url
* description - to show up in the CLI tool
* cliArguments - to show up in the CLI tool

## Extends

- `Workflow`

## Constructors

### Constructor

> **new XStateWorkflow**(): `XStateWorkflow`

#### Returns

`XStateWorkflow`

#### Inherited from

`Workflow.constructor`

## Properties

### cliArguments

> `abstract` `readonly` **cliArguments**: readonly [`CLIArgument`](../interfaces/CLIArgument.md)[]

#### Inherited from

`Workflow.cliArguments`

***

### description

> `abstract` `readonly` **description**: `string`

#### Inherited from

`Workflow.description`

***

### machine

> `abstract` `readonly` **machine**: `AnyStateMachine`

***

### sourceUrl

> `abstract` `readonly` **sourceUrl**: `string`

#### Inherited from

`Workflow.sourceUrl`

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Overrides

`Workflow.name`

## Methods

### dehydrate()

> **dehydrate**(): `WorkflowBlob`

#### Returns

`WorkflowBlob`

#### Overrides

`Workflow.dehydrate`

***

### done()

> **done**(): `boolean`

#### Returns

`boolean`

#### Overrides

`Workflow.done`

***

### getChecklist()

> **getChecklist**(): `ChecklistItem`[]

#### Returns

`ChecklistItem`[]

#### Overrides

`Workflow.getChecklist`

***

### getCurrentStateName()

> **getCurrentStateName**(): `string`

#### Returns

`string`

#### Overrides

`Workflow.getCurrentStateName`

***

### getError()

> **getError**(): `undefined` \| `Error`

#### Returns

`undefined` \| `Error`

#### Overrides

`Workflow.getError`

***

### goToNextStep()

> **goToNextStep**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Workflow.goToNextStep`

***

### hydrate()

> **hydrate**(`blob`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `WorkflowBlob` |

#### Returns

`void`

#### Overrides

`Workflow.hydrate`

***

### init()

> **init**(`options`, ...`args`): `Promise`\<`ReturnsError`\<`any`\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `XStateWorkflowOptions` |
| ...`args` | `string`[] |

#### Returns

`Promise`\<`ReturnsError`\<`any`\>\>

#### Overrides

`Workflow.init`

***

### kickoff()

> **kickoff**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Overrides

`Workflow.kickoff`

***

### printStatus()

> **printStatus**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`Workflow.printStatus`
