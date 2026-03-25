# Wrapping Third-Party Error Responses

When building an SDK around a third-party API, the API's use of HTTP status codes may not match your application's semantics. This doc covers how to handle that mismatch with TanStack Query.

## The problem

Our own APIs follow a simple convention: 2xx means success, 4xx/5xx means error, and every error thrown to TanStack is a `TanstackError`. The frontend never renders backend error strings — it maps `TanstackError.status` to client-controlled messages via `getTanstackErrorMessage`.

Third-party APIs don't follow this convention. Consider Ory Kratos:

- **400** means "validation failed, here's the updated form with error messages" — the UI needs to re-render, not show an error banner.
- **422** means "recovery succeeded, redirect the browser here" — this is a success, not an error.
- **200** means "flow completed" — the only actual success in HTTP terms.

If we let these 4xx responses flow through TanStack as errors, several things go wrong:

1. **TanStack marks the mutation as failed.** `isError` becomes true, error boundaries may fire, and retry logic kicks in — all for what is a normal, expected UI interaction.
2. **The response body is buried inside an AxiosError.** Consumers have to dig into `error.response?.data` and type-narrow it, duplicating extraction logic across every call site.
3. **Generic error handling catches expected responses.** A global error handler that shows a toast for all `TanstackError` instances would fire on a password validation failure.

## The principle

**Route responses through TanStack's success or error path based on your application's semantics, not the HTTP status code.**

- If the response is an expected part of the user flow and the UI handles it gracefully, **return it** from `mutationFn` (success path).
- If the response is unexpected and the best the UI can do is show a generic error, **throw a `TanstackError`** (error path).

The HTTP status code is a transport detail between you and the third-party API. Your SDK should translate it into your domain's notion of expected vs. unexpected.

## When to return vs. throw

| Scenario | HTTP status | Application meaning | TanStack path |
|---|---|---|---|
| Form validation failed | 400 | Expected — re-render with errors | **Return** (success) |
| Browser redirect required | 422 | Expected — navigate to URL | **Return** (success) |
| Flow expired | 410 | Partially expected — create a new flow | **Throw** `TanstackError` |
| Rate limited | 429 | Unexpected — generic retry message | **Throw** `TanstackError` |
| Server error | 5xx | Unexpected — generic error message | **Throw** `TanstackError` |
| Auth required | 401 | Unexpected — redirect to login | **Throw** `TanstackError` |
| Forbidden | 403 | Unexpected — generic permission error | **Throw** `TanstackError` |
| Not found | 404 | Unexpected — generic not-found message | **Throw** `TanstackError` |

The key question is: **does the consumer need the response body to decide what to do?** If yes, return it. If the consumer just needs to know "something went wrong" and show a generic message based on the status code, throw a `TanstackError`.

## How to structure the mutation

### Step 1: Identify the expected outcomes

List every response the API can return and decide which ones are expected. For a Kratos registration update:

- **200**: Registration completed (`SuccessfulNativeRegistration`)
- **400**: Validation failed (updated `RegistrationFlow` with error messages)
- **Everything else**: Unexpected

### Step 2: Create result classes for distinct outcomes

When the mutation can return multiple distinct outcomes that the consumer handles differently, create a class for each:

```ts
export class RegistrationFlowUpdated {
  constructor(readonly flow: RegistrationFlow) {}
}

export class RegistrationCompleted {
  constructor(readonly result: SuccessfulNativeRegistration) {}
}
```

Classes give you `instanceof` narrowing, which is more ergonomic than string-discriminated unions and consistent with the `instanceof` pattern used for domain errors on the backend (e.g. `CollectionNotFoundError`).

When all expected outcomes share the same shape (e.g. settings — both 200 and 400 return a `SettingsFlow` handled identically), skip the wrapper and return the type directly.

### Step 3: Write the mutationFn

Catch the third-party error, check if it's an expected response, and return or throw accordingly:

```ts
export const useUpdateRegistrationFlowMutation = () => {
  return useMutation<
    RegistrationFlowUpdated | RegistrationCompleted,
    TanstackError,
    FrontendApiUpdateRegistrationFlowRequest
  >({
    mutationFn: async (vars) => {
      try {
        const res = await api.updateRegistrationFlow(vars);
        return new RegistrationCompleted(res.data);
      } catch (e: unknown) {
        // Expected: validation error with updated flow
        const flow = extractRegistrationFlow(e);
        if (flow) return new RegistrationFlowUpdated(flow);

        // Unexpected: normalize to TanstackError
        if (e instanceof AxiosError) {
          throw new TanstackError(e.response?.status ?? 0);
        }
        throw e;
      }
    },
  });
};
```

The pattern is always the same:

1. Try the API call; wrap success in a result class.
2. Catch errors; check for expected response shapes and return them.
3. Fall through to `throw new TanstackError(status)` for anything unexpected.

### Step 4: Consume with instanceof

The consumer's control flow becomes linear — no nested try/catch for expected outcomes:

```ts
let result;
try {
  result = await updateRegistration.mutateAsync({...});
} catch (e) {
  submitError.value = getErrorMessage(e);
  return;
}

if (result instanceof RegistrationFlowUpdated) {
  queryClient.setQueryData(key, result.flow);
  return;
}

// RegistrationCompleted — proceed
```

## Applying this to queries

Queries are simpler because they typically have one expected response (the data) and everything else is an error. The main thing to get right is **typing the error as `TanstackError`** so it flows through to consumers without casts:

```ts
return queryOptions<LoginFlow, TanstackError>({
  queryKey,
  queryFn: async () => fetchLoginFlowById(flowId),
  retry: kratosFlowQueryRetry,
  enabled,
});
```

If the underlying fetch function can throw third-party errors (like AxiosErrors), normalize them to `TanstackError` in the fetch function itself:

```ts
async function fetchRecoveryFlowById(flowId: string): Promise<RecoveryFlow> {
  try {
    const res = await api.getRecoveryFlow({ id: flowId });
    return res.data;
  } catch (e) {
    if (isAxiosError(e)) throw new TanstackError(e.response?.status ?? 0);
    throw e;
  }
}
```

This keeps the query layer clean — `queryFn` just calls a function that returns data or throws `TanstackError`.

## Summary

1. **Expected responses belong in TanStack's success path.** Return them from `mutationFn`, even if the HTTP status was 4xx.
2. **Unexpected errors belong in TanStack's error path.** Normalize them to `TanstackError` so generic error handling works uniformly.
3. **Use result classes for `instanceof` narrowing** when a mutation has multiple distinct outcomes. Skip wrappers when all outcomes are the same shape.
4. **Type queries with `queryOptions<Data, TanstackError>`** so error types propagate without `as` casts.
5. **Normalize third-party errors at the boundary.** Convert AxiosErrors (or whatever the SDK throws) to `TanstackError` in fetch functions or `mutationFn` catch blocks — never let raw third-party error types leak to consumers.
