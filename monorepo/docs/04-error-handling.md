# Error Handling Philosophy

This document outlines the standard approach to error handling within the Vendata backend services, particularly concerning database queries and service layer interactions. The primary goals are robustness, type safety, and clear communication of intent.

## Core Pattern: `ReturnsError<T, E>`

Functions that can predictably fail (e.g., a database query that might not find a record) should not throw exceptions for these expected failures. Instead, they should return a discriminated union type, typically using the `ReturnsError` helper type:

```typescript
import type { ReturnsError } from "@saflib/monorepo"; // Or appropriate path

type SuccessDataType = {
  /* ... data shape ... */
};
class ExpectedErrorType extends Error {
  /* ... custom error details ... */
}

async function potentiallyFailingOperation(): Promise<
  ReturnsError<SuccessDataType, ExpectedErrorType>
> {
  try {
    const data = await performDbQuery();
    if (!data) {
      // Return the expected error instance, wrapped
      return { error: new ExpectedErrorType("Record not found") };
    }
    // Return the success data, wrapped
    return { result: data };
  } catch (e) {
    // Handle truly *unexpected* infrastructure errors if necessary,
    // otherwise let them propagate (throw)
    if (e instanceof SomeInfrastructureError) {
      // Maybe log or wrap, then rethrow
      throw new Error("Unexpected database issue", { cause: e });
    }
    throw e;
  }
}
```

The `ReturnsError<T, E>` type is conceptually defined as:

```typescript
type ReturnsError<T, E> =
  | { result: T; error?: never }
  | { error: E; result?: never };
```

This ensures that a function's return value _must_ be either a success object containing `result` or an error object containing `error`, but not both.

## Consuming `ReturnsError`

Callers of functions returning `ReturnsError` **must** check for the presence of the `error` property before attempting to access `result`. TypeScript's control flow analysis will correctly narrow the type.

```typescript
const outcome = await potentiallyFailingOperation();

if (outcome.error) {
  // Handle the expected error
  console.error("Operation failed:", outcome.error.message);
  // Example: Return an appropriate HTTP status code
  if (outcome.error instanceof ExpectedErrorType) {
    return res.status(404).send(outcome.error.message);
  }
  // Use switch for multiple expected error types
  switch (true) {
    case outcome.error instanceof SpecificErrorA:
      // handle A
      break;
    case outcome.error instanceof SpecificErrorB:
      // handle B
      break;
    default:
      // Ensure all error types are handled
      throw outcome.error satisfies never;
  }
} else {
  // No error, safe to access result
  console.log("Operation succeeded:", outcome.result);
  // ... process outcome.result ...
}
```

## `throwError` Utility

In situations where a caller _knows_ an error returned by a `ReturnsError` function should be impossible or represents an unrecoverable state in the current context, the `throwError` utility (from `@saflib/monorepo` or similar) can be used.

```typescript
import { throwError } from "@saflib/monorepo";

// In this context, we expect the record *always* exists.
// If getRecordById returns its 'NotFoundError', it's an unexpected state here.
const record = throwError(await db.getRecordById(id), UnexpectedStateError);

// If no error was returned by getRecordById, 'record' is the result.
// If an error *was* returned, throwError throws a new UnexpectedStateError
// (or the original error if no wrapper is provided).
```

This avoids repetitive `if (outcome.error) { throw new Error(...) }` blocks for cases that should logically never fail.

## Philosophy Summary

- **Return Expected Errors:** Functions should _return_ errors that are predictable outcomes of their operation (e.g., Not Found, Validation Failed) using the `ReturnsError` pattern.
- **Throw Unexpected Errors:** Functions should _throw_ exceptions for truly unexpected situations (e.g., database connection lost, programming errors, unrecoverable states). These typically result in a 500 Internal Server Error response at the API boundary.
- **Caller Responsibility:** Callers are responsible for checking returned errors and handling them appropriately (either recovering or translating them, potentially throwing if the error is unexpected in the calling context).
