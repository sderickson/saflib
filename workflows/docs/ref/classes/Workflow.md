[**@saflib/workflows**](../index.md)

***

# Abstract Class: Workflow

Abstract superclass for SimpleWorkflow and XStateWorkflow. To be removed
when XStateWorkflow is fully adopted.

## Extended by

- [`XStateWorkflow`](XStateWorkflow.md)
- [`SimpleWorkflow`](SimpleWorkflow.md)

## Constructors

### Constructor

> **new Workflow**(): `Workflow`

#### Returns

`Workflow`

## Properties

### cliArguments

> `abstract` `readonly` **cliArguments**: [`CLIArgument`](../interfaces/CLIArgument.md)[]

***

### description

> `abstract` `readonly` **description**: `string`

***

### init()

> `abstract` **init**: (...`args`) => `Promise`\<`ReturnsError`\<`any`\>\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `any`[] |

#### Returns

`Promise`\<`ReturnsError`\<`any`\>\>

***

### name

> `abstract` `readonly` **name**: `string`

***

### sourceUrl

> `abstract` `readonly` **sourceUrl**: `string`

## Methods

### dehydrate()

> `abstract` **dehydrate**(): `WorkflowBlob`

#### Returns

`WorkflowBlob`

***

### done()

> `abstract` **done**(): `boolean`

#### Returns

`boolean`

***

### getChecklist()

> `abstract` **getChecklist**(): [`ChecklistItem`](../interfaces/ChecklistItem.md)[]

#### Returns

[`ChecklistItem`](../interfaces/ChecklistItem.md)[]

***

### getCurrentStateName()

> `abstract` **getCurrentStateName**(): `string`

#### Returns

`string`

***

### getError()

> `abstract` **getError**(): `undefined` \| `Error`

#### Returns

`undefined` \| `Error`

***

### goToNextStep()

> `abstract` **goToNextStep**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### hydrate()

> `abstract` **hydrate**(`blob`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `blob` | `WorkflowBlob` |

#### Returns

`void`

***

### kickoff()

> `abstract` **kickoff**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

***

### printStatus()

> `abstract` **printStatus**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
