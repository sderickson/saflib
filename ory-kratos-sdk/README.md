# @saflib/ory-kratos-sdk

TanStack Query bindings for the [Ory Kratos](https://www.ory.sh/docs/kratos/) self-service flows (login, registration, recovery, verification, settings).

This package wraps the `@ory/client` Axios SDK with Vue Query queries and mutations, translating Kratos's HTTP responses into a shape that plays well with TanStack's success/error lifecycle and our `TanstackError` convention from `@saflib/sdk`.

## Why a separate SDK?

Kratos is a third-party API we don't control. Its HTTP semantics differ from our own APIs in important ways:

- **Validation errors return 400** with an updated flow object (same shape as a successful GET). The UI must re-render the flow — this is a normal, expected part of every flow.
- **Successful completion returns 200** with either the flow or a `SuccessfulNativeLogin`/`SuccessfulNativeRegistration` object, depending on the flow type.
- **Browser redirects return 422** (`ErrorBrowserLocationChangeRequired`) when the client must navigate to a Kratos-provided URL. This commonly happens during recovery after the code is accepted.
- **Expired flows return 410**, indicating the flow timed out and a new one must be created.

Because Kratos uses 4xx status codes for expected responses, we can't simply let errors propagate through TanStack as-is. See [Wrapping Third-Party Error Responses](../sdk/docs/05-wrapping-third-party-error-responses.md) in the `@saflib/sdk` docs for the design rationale.

## Queries

Each flow type has a query file exporting a `xxxFlowQueryKey` function (for manual cache operations), a `xxxFlowQueryOptions` function (returning a typed `queryOptions` object), and a `useXxxFlowQuery` convenience wrapper. All accept a single options object with optional `flowId`, `returnTo`, and `enabled` (a `Ref<boolean>` for reactive gating).

### Typing queries with `TanstackError`

Pass explicit type parameters to `queryOptions` so the error type flows through to consumers without `as` casts:

```ts
return queryOptions<LoginFlow, TanstackError>({
  queryKey,
  queryFn: async () => fetchLoginFlowById(flowId),
  ...
});
```

### Using queries in loaders

Loaders should use the `useXxxFlowQuery` wrapper directly, passing `enabled` as a computed ref:

```ts
const loginFlowEnabled = computed(
  () => !sessionQuery.isPending.value && !sessionQuery.data.value,
);

return {
  sessionQuery,
  loginFlowQuery: useLoginFlowQuery({
    flowId: flowId.value,
    returnTo: browserReturnTo.value,
    enabled: loginFlowEnabled,
  }),
};
```

### Using queries in composables

Composables that need the query options to be reactive (because `flowId` or `returnTo` can change within the page lifecycle) should wrap in `computed()`:

```ts
const loginFlowQuery = useQuery(
  computed(() =>
    loginFlowQueryOptions({
      flowId: toValue(flowId),
      returnTo: returnTo.value,
    }),
  ),
);
```

### Retry

All flow queries use `kratosFlowQueryRetry`, which suppresses retries for HTTP 410 (expired flow) — retrying an expired flow is pointless. Other errors retry up to 3 times per TanStack defaults.

## Mutations

Each flow type has a mutation composable (`useUpdateXxxFlowMutation`) that returns a `useMutation` result. The mutations follow two rules:

1. **Expected responses are returned, not thrown.** Kratos 4xx responses that are part of the normal flow lifecycle (validation errors, browser redirects) are caught in the `mutationFn` and returned as success values.
2. **Unexpected errors are normalized to `TanstackError`.** Any AxiosError that isn't an expected response is converted to `TanstackError(status)` and thrown, keeping the error type consistent with the rest of the stack.

### Result types

When a mutation can produce multiple distinct outcomes, each outcome is a class so consumers can use `instanceof`:

```ts
// Registration: two distinct outcomes
const result = await updateRegistration.mutateAsync({...});

if (result instanceof RegistrationFlowUpdated) {
  // 400 validation — re-render with updated flow
  queryClient.setQueryData(key, result.flow);
  return;
}
// result is RegistrationCompleted — proceed with post-registration logic
```

When all expected outcomes share the same shape and handling (settings, verification), the mutation returns the flow type directly with no wrapper:

```ts
// Settings: both 200 and 400 return a SettingsFlow, handled the same way
const updated = await updateSettings.mutateAsync({...});
queryClient.setQueryData(key, updated);
```

### Error type

All mutations declare `TanstackError` as their error type, consistent with the `defaultError` registered for Vue Query and with the convention from `@saflib/sdk`. Consumers can rely on `error instanceof TanstackError` and use `getTanstackErrorMessage(error)` for generic display.

### Consumer pattern

Consumers call `mutateAsync` in a try/catch. The try block handles the returned result with `instanceof` checks. The catch block handles only genuinely unexpected errors:

```ts
try {
  let result;
  try {
    result = await updateLogin.mutateAsync({...});
  } catch (e) {
    // Truly unexpected error (5xx, network failure)
    submitError.value = registrationSubmitErrorMessage(e, fallbackString);
    return;
  }

  if (result instanceof LoginFlowUpdated) {
    queryClient.setQueryData(key, result.flow);
    return;
  }

  // LoginCompleted — proceed with session handling and navigation
  await invalidateKratosSessionQueries(queryClient);
  // ...
} finally {
  submitting.value = false;
}
```
