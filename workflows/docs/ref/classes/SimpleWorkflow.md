[**@saflib/workflows**](../index.md)

***

# Abstract Class: SimpleWorkflow\<P, D\>

## Extends

- [`Workflow`](Workflow.md)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `P` *extends* `Record`\<`string`, `any`\> | - |
| `D` *extends* `Record`\<`string`, `any`\> | `object` |

## Constructors

### Constructor

> **new SimpleWorkflow**\<`P`, `D`\>(): `SimpleWorkflow`\<`P`, `D`\>

#### Returns

`SimpleWorkflow`\<`P`, `D`\>

#### Inherited from

[`Workflow`](Workflow.md).[`constructor`](Workflow.md#constructor)

## Properties

### cliArguments

> `abstract` `readonly` **cliArguments**: [`CLIArgument`](../interfaces/CLIArgument.md)[]

#### Inherited from

[`Workflow`](Workflow.md).[`cliArguments`](Workflow.md#cliarguments)

***

### data?

> `optional` **data**: `D`

***

### description

> `abstract` `readonly` **description**: `string`

#### Inherited from

[`Workflow`](Workflow.md).[`description`](Workflow.md#description)

***

### init()

> `abstract` **init**: (...`args`) => `Promise`\<[`Result`](../type-aliases/Result.md)\<`D`\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `any`[] |

#### Returns

`Promise`\<[`Result`](../type-aliases/Result.md)\<`D`\>\>

#### Overrides

[`Workflow`](Workflow.md).[`init`](Workflow.md#init)

***

### name

> `abstract` `readonly` **name**: `string`

#### Inherited from

[`Workflow`](Workflow.md).[`name`](Workflow.md#name)

***

### params?

> `optional` **params**: `P`

***

### sourceUrl

> `abstract` `readonly` **sourceUrl**: `string`

#### Inherited from

[`Workflow`](Workflow.md).[`sourceUrl`](Workflow.md#sourceurl)

***

### steps

> `abstract` **steps**: [`Step`](../interfaces/Step.md)[]

***

### workflowPrompt()

> `abstract` **workflowPrompt**: () => `string`

#### Returns

`string`

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

### getData()

> **getData**(): `D`

#### Returns

`D`

***

### getError()

> **getError**(): `undefined` \| `Error`

#### Returns

`undefined` \| `Error`

#### Overrides

[`Workflow`](Workflow.md).[`getError`](Workflow.md#geterror)

***

### getParams()

> **getParams**(): `P`

#### Returns

`P`

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

### kickoff()

> **kickoff**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`Workflow`](Workflow.md).[`kickoff`](Workflow.md#kickoff)

***

### print()

> **print**(`message`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

#### Returns

`void`

***

### printStatus()

> **printStatus**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Workflow`](Workflow.md).[`printStatus`](Workflow.md#printstatus)

***

### setData()

> **setData**(`data`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `D` |

#### Returns

`void`
