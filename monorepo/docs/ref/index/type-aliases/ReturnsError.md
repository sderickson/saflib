[**@saflib/monorepo**](../../index.md)

---

# Type Alias: ReturnsError\<T, E\>

> **ReturnsError**\<`T`, `E`\> = `OneOf`\<\{ `error`: `E`; `result`: `T`; \}\>

An object with either a `result` or an `error`.
Async functions which are exported by packages, such as database queries and integration calls,
should use this for their return types. This way errors are typed and can be handled
with type safety.

Users of ReturnError should use it like this:

```typescript
// Make any errors available as a package export so consumers
// can check for them in a switch statement.
export class ExpectedError extends Error {}

export const unsafeOperation = async (): Promise<
  ReturnsError<string, ExpectedError>
> => {
  // ... some code ...
  if (conditionFails) {
    return { error: new ExpectedError("Condition failed") };
  }
  return { result: "success" };
};
```

Consumers of functions that ReturnError should handle the errors like this:

```typescript
const { result, error } = await unsafeOperation();
if (error) {
  switch (true) {
    case error instanceof ErrorClass:
      return res.status(errorCode);
    default:
      throw error satisfies never;
  }
}
```

## Type Parameters

| Type Parameter        | Default type |
| --------------------- | ------------ |
| `T`                   | -            |
| `E` _extends_ `Error` | `Error`      |
