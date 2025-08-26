[**@saflib/vue**](../../../../index.md)

***

# Type Alias: UseMutationReturnType\<TData, TError, TVariables, TContext, TResult\>

> **UseMutationReturnType**\<`TData`, `TError`, `TVariables`, `TContext`, `TResult`\> = `ToRefs`\<`Readonly`\<`TResult`\>\> & `object`

## Type declaration

### mutate

> **mutate**: `MutateSyncFunction`\<`TData`, `TError`, `TVariables`, `TContext`\>

### mutateAsync

> **mutateAsync**: `MutateFunction`\<`TData`, `TError`, `TVariables`, `TContext`\>

### reset

> **reset**: `MutationObserverResult`\<`TData`, `TError`, `TVariables`, `TContext`\>\[`"reset"`\]

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TData` | - |
| `TError` | - |
| `TVariables` | - |
| `TContext` | - |
| `TResult` | `MutationResult`\<`TData`, `TError`, `TVariables`, `TContext`\> |
