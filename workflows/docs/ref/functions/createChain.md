[**@saflib/workflows**](../index.md)

***

# Function: createChain()

> **createChain**\<`T`\>(`factories`): `object`

Creates a chain of XState machine states from an array of factory functions.

This helper simplifies creating sequential workflows by automatically handling
state naming and transitions. Instead of manually specifying stateName and 
nextStateName for each factory, this function generates them automatically.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* readonly `FactoryTuple`\<`any`\>[] |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `factories` | `T` | Array of tuples, each containing a factory function and its options |

## Returns

`object`

Object with initial state name and states object

### initial

> **initial**: `string`

### states

> **states**: `Record`\<`string`, `any`\>

## Example

```ts
// Instead of this verbose approach:
states: {
  ...useTemplateStateFactory({
    stateName: "copyTemplate",
    nextStateName: "updateLoader",
  }),
  ...updateTemplateFileFactory({
    filePath: "loader.ts",
    promptMessage: "Update the loader",
    stateName: "updateLoader", 
    nextStateName: "runTests",
  }),
  ...runTestsFactory({
    filePath: "test.ts",
    stateName: "runTests",
    nextStateName: "done",
  }),
  done: { type: "final" }
}

// You can use this concise approach:
const { initial, states } = createChain([
  [useTemplateStateFactory, {}],
  [updateTemplateFileFactory, { 
    filePath: "loader.ts", 
    promptMessage: "Update the loader" 
  }],
  [runTestsFactory, { filePath: "test.ts" }],
]);
```
