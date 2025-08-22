[**@saflib/workflows**](../index.md)

***

# Abstract Class: XStateWorkflow

## Extends

- [`Workflow`](Workflow.md)

## Constructors

### Constructor

> **new XStateWorkflow**(): `XStateWorkflow`

#### Returns

`XStateWorkflow`

#### Inherited from

[`Workflow`](Workflow.md).[`constructor`](Workflow.md#constructor)

## Properties

### cliArguments

> `abstract` `readonly` **cliArguments**: [`CLIArgument`](../interfaces/CLIArgument.md)[]

#### Inherited from

[`Workflow`](Workflow.md).[`cliArguments`](Workflow.md#cliarguments)

***

### description

> `abstract` `readonly` **description**: `string`

#### Inherited from

[`Workflow`](Workflow.md).[`description`](Workflow.md#description)

***

### machine

> `abstract` `readonly` **machine**: `AnyStateMachine`

***

### sourceUrl

> `abstract` `readonly` **sourceUrl**: `string`

#### Inherited from

[`Workflow`](Workflow.md).[`sourceUrl`](Workflow.md#sourceurl)

## Accessors

### name

#### Get Signature

> **get** **name**(): `string`

##### Returns

`string`

#### Overrides

[`Workflow`](Workflow.md).[`name`](Workflow.md#name)

## Methods

### dehydrate()

> **dehydrate**(): [`WorkflowBlob`](../interfaces/WorkflowBlob.md)

#### Returns

[`WorkflowBlob`](../interfaces/WorkflowBlob.md)

#### Overrides

[`Workflow`](Workflow.md).[`dehydrate`](Workflow.md#dehydrate)

***

### done()

> **done**(): `boolean`

#### Returns

`boolean`

#### Overrides

[`Workflow`](Workflow.md).[`done`](Workflow.md#done)

***

### getChecklist()

> **getChecklist**(): [`ChecklistItem`](../interfaces/ChecklistItem.md)[]

#### Returns

[`ChecklistItem`](../interfaces/ChecklistItem.md)[]

#### Overrides

[`Workflow`](Workflow.md).[`getChecklist`](Workflow.md#getchecklist)

***

### getCurrentStateName()

> **getCurrentStateName**(): `string`

#### Returns

`string`

#### Overrides

[`Workflow`](Workflow.md).[`getCurrentStateName`](Workflow.md#getcurrentstatename)

***

### getError()

> **getError**(): `undefined` \| `Error`

#### Returns

`undefined` \| `Error`

#### Overrides

[`Workflow`](Workflow.md).[`getError`](Workflow.md#geterror)

***

### goToNextStep()

> **goToNextStep**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Workflow`](Workflow.md).[`goToNextStep`](Workflow.md#gotonextstep)

***

### hydrate()

> **hydrate**(`blob`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | [`WorkflowBlob`](../interfaces/WorkflowBlob.md) |

#### Returns

`void`

#### Overrides

[`Workflow`](Workflow.md).[`hydrate`](Workflow.md#hydrate)

***

### init()

> **init**(`options`, ...`args`): `Promise`\<[`Result`](../type-aliases/Result.md)\<`any`\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `XStateWorkflowOptions` |
| ...`args` | `string`[] |

#### Returns

`Promise`\<[`Result`](../type-aliases/Result.md)\<`any`\>\>

#### Overrides

`Workflow.init`

***

### kickoff()

> **kickoff**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`Workflow`](Workflow.md).[`kickoff`](Workflow.md#kickoff)

***

### printStatus()

> **printStatus**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Workflow`](Workflow.md).[`printStatus`](Workflow.md#printstatus)
