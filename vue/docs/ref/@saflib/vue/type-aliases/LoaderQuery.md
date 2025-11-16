[**@saflib/vue**](../../../index.md)

---

# Type Alias: LoaderQuery\<TData\>

> **LoaderQuery**\<`TData`\> = `Pick`\<`UseQueryReturnType`\<`any`, `TanstackError`\>, `"isLoading"` \| `"error"`\> & `object`

A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties.

## Type declaration

### data

> **data**: `TData`

### isError

> **isError**: `Ref`\<`boolean`\>

## Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `TData`        | `undefined`  |
