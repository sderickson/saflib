[**@saflib/workflows**](../index.md)

***

# Abstract Class: XStateWorkflowRunner

A class used to load and run the workflow, managing XState events and I/O operations. This is an abstract super class and should be subclassed with the WorkflowDefinition and other properties set. Those subclasses are what the CLI tool uses to create and run workflows.

To use, subclass it with:
* machine - the XState machine for the workflow.
* sourceUrl - import.meta.url
* description - to show up in the CLI tool
* cliArguments - to show up in the CLI tool

## Extends

- `AbstractWorkflowRunner`

## Constructors

### Constructor

> **new XStateWorkflowRunner**(): `XStateWorkflowRunner`

#### Returns

`XStateWorkflowRunner`

#### Inherited from

`AbstractWorkflowRunner.constructor`

## Properties

### cliArguments

> `abstract` `readonly` **cliArguments**: readonly [`WorkflowArgument`](../interfaces/WorkflowArgument.md)[]

#### Inherited from

`AbstractWorkflowRunner.cliArguments`

***

### description

> `abstract` `readonly` **description**: `string`

#### Inherited from

`AbstractWorkflowRunner.description`

***

### machine

> `abstract` `readonly` **machine**: `AnyStateMachine`

***

### sourceUrl

> `abstract` `readonly` **sourceUrl**: `string`

#### Inherited from

`AbstractWorkflowRunner.sourceUrl`

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Overrides

`AbstractWorkflowRunner.name`

## Methods

### dehydrate()

> **dehydrate**(): `WorkflowBlob`

#### Returns

`WorkflowBlob`

#### Overrides

`AbstractWorkflowRunner.dehydrate`

***

### done()

> **done**(): `boolean`

#### Returns

`boolean`

#### Overrides

`AbstractWorkflowRunner.done`

***

### getChecklist()

> **getChecklist**(): `ChecklistItem`[]

#### Returns

`ChecklistItem`[]

#### Overrides

`AbstractWorkflowRunner.getChecklist`

***

### getCurrentStateName()

> **getCurrentStateName**(): `string`

#### Returns

`string`

#### Overrides

`AbstractWorkflowRunner.getCurrentStateName`

***

### getError()

> **getError**(): `undefined` \| `Error`

#### Returns

`undefined` \| `Error`

#### Overrides

`AbstractWorkflowRunner.getError`

***

### goToNextStep()

> **goToNextStep**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`AbstractWorkflowRunner.goToNextStep`

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

`AbstractWorkflowRunner.hydrate`

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

`AbstractWorkflowRunner.init`

***

### kickoff()

> **kickoff**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Overrides

`AbstractWorkflowRunner.kickoff`

***

### printStatus()

> **printStatus**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`AbstractWorkflowRunner.printStatus`
