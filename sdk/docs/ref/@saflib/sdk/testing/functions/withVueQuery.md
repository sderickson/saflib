[**@saflib/sdk**](../../../../index.md)

***

# Function: withVueQuery()

> **withVueQuery**\<`T`\>(`composable`, `queryClient?`): \[`T`, `App`\<`Element`\>, `any`\]

Helper function to test Vue Query composables in isolation.

```typescript
const [query, app, queryClient] = withVueQuery(() =>
  useQuery(getContact(contactId)),
);
await query.refetch();
expect(query.data.value).toEqual(mockContact);
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `composable` | () => `T` |
| `queryClient?` | `any` |

## Returns

\[`T`, `App`\<`Element`\>, `any`\]
