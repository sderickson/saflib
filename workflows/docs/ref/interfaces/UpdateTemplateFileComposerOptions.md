[**@saflib/workflows**](../index.md)

***

# Interface: UpdateTemplateFileComposerOptions\<C\>

Options for the updateTemplateComposer function.

## Extends

- [`ComposerFunctionOptions`](ComposerFunctionOptions.md)

## Type Parameters

| Type Parameter |
| ------ |
| `C` *extends* [`WorkflowContext`](WorkflowContext.md) |

## Properties

### filePath

> **filePath**: `string` \| (`context`) => `string`

Path to the file to update. Can be a string or a function that returns a string.
The string is expected to be resolved

***

### nextStateName

> **nextStateName**: `string`

#### Inherited from

[`ComposerFunctionOptions`](ComposerFunctionOptions.md).[`nextStateName`](ComposerFunctionOptions.md#nextstatename)

***

### promptMessage

> **promptMessage**: `string` \| (`context`) => `string`

Message to prompt the agent with.

***

### stateName

> **stateName**: `string`

#### Inherited from

[`ComposerFunctionOptions`](ComposerFunctionOptions.md).[`stateName`](ComposerFunctionOptions.md#statename)
