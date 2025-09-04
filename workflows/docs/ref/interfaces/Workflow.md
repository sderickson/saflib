[**@saflib/workflows**](../index.md)

***

# Interface: Workflow\<I, C\>

A workflow definition. Can be used to create an XState machine which, when run, will execute the workflow.

## Type Parameters

| Type Parameter |
| ------ |
| `I` *extends* readonly [`CLIArgument`](CLIArgument.md)[] |
| `C` |

## Properties

### context()

> **context**: (`arg`) => `C`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `arg` | \{ `input`: [`CreateArgsType`](../type-aliases/CreateArgsType.md)\<`I`\>; \} |
| `arg.input` | [`CreateArgsType`](../type-aliases/CreateArgsType.md)\<`I`\> |

#### Returns

`C`

***

### description

> **description**: `string`

***

### docFiles

> **docFiles**: `Record`\<`string`, `string`\>

The key is the id to b e used in the machine, and the value is the absolute path to the doc file.

***

### id

> **id**: `string`

***

### input

> **input**: `I`

***

### steps

> **steps**: [`Step`](../type-aliases/Step.md)\<`C`, `AnyStateMachine`\>[]

***

### templateFiles

> **templateFiles**: `Record`\<`string`, `string`\>

The key is the id to be used in the machine, and the value is the absolute path to the template file.
