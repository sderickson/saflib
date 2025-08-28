[**@saflib/vue**](../../../index.md)

***

# Type Alias: LoaderQuery

> **LoaderQuery** = `Pick`\<`UseQueryReturnType`\<`any`, [`TanstackError`](../tanstack/classes/TanstackError.md)\>, `"isLoading"` \| `"error"`\> & `object`

A subset of what `useQuery` returns. This is so that loaders can create pseudo-queries by simply creating objects with isLoading, error, and isError properties.

## Type declaration

### isError

> **isError**: `Ref`\<`boolean`\>
