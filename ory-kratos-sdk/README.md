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

Each flow type has a query file exporting three things:

| Export                       | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `xxxFlowQueryKey(...)`       | Build the cache key for manual `setQueryData`/`invalidateQueries`    |
| `xxxFlowQueryOptions({...})` | Return a `queryOptions(...)` object typed as `<Flow, TanstackError>` |
| `useXxxFlowQuery({...})`     | Convenience wrapper: calls `useQuery` with the options               |

All three accept a single options object:

```ts
interface XxxFlowQueryOptions {
  flowId?: string; // resume an existing flow by id (?flow=...)
  returnTo?: string; // Kratos return_to for browser flow creation
  enabled?: Ref<boolean>; // reactive gate (e.g. wait until session check completes)
}
```

### Typing queries with `TanstackError`

Pass explicit type parameters to `queryOptions` so the error type flows through to consumers:

```ts
return queryOptions<LoginFlow, TanstackError>({
  queryKey,
  queryFn: async () => fetchLoginFlowById(flowId),
  ...
});
```

This eliminates the need for `as` casts when using the query in loaders or composables.

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

### Result class summary

| Flow         | Return type                                        | Classes                                                                           |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Registration | `RegistrationFlowUpdated \| RegistrationCompleted` | `RegistrationFlowUpdated` (400 validation), `RegistrationCompleted` (200 success) |
| Login        | `LoginFlowUpdated \| LoginCompleted`               | `LoginFlowUpdated` (400 validation), `LoginCompleted` (200 success)               |
| Recovery     | `RecoveryFlow \| BrowserRedirectRequired`          | `BrowserRedirectRequired` (422 redirect); `RecoveryFlow` returned unwrapped       |
| Settings     | `SettingsFlow`                                     | None needed — single shape                                                        |
| Verification | `VerificationFlow`                                 | None needed — single shape                                                        |

### Error type

All mutations declare `TanstackError` as their error type. This is consistent with the `defaultError` registered in `vue-query-register.ts` and with the convention from `@saflib/sdk`. Consumers can rely on `error instanceof TanstackError` and use `getTanstackErrorMessage(error)` for generic display.

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

## Package structure

```
ory-kratos-sdk/
├── kratos-client.ts           # Shared FrontendApi instance (Axios + cookies)
├── kratos-flows.ts            # Plain fetch functions for creating/getting flows
├── kratos-http-error.ts       # HTTP error helpers (e.g. isKratosFlowGoneError)
├── kratos-identity.ts         # Identity helpers (email verification check)
├── kratos-query-retry.ts      # TanStack retry callback (skip 410)
├── kratos-session.ts          # Session query, invalidation, helpers
├── kratos-mocks.ts            # Test mocks
├── kratos.fake.ts             # Fake Kratos for testing
├── vue-query-register.ts      # Register TanstackError as defaultError
├── login-flow-query.ts        # Login flow query + key
├── registration-flow-query.ts # Registration flow query + key
├── recovery-flow-query.ts     # Recovery flow query + key
├── settings-flow-query.ts     # Settings flow query + key
├── verification-flow-query.ts # Verification flow query + key
├── use-update-login-flow.ts       # Login mutation + result classes
├── use-update-registration-flow.ts # Registration mutation + result classes
├── use-update-recovery-flow.ts    # Recovery mutation + BrowserRedirectRequired
├── use-update-settings-flow.ts    # Settings mutation (returns SettingsFlow)
├── use-update-verification-flow.ts # Verification mutation (returns VerificationFlow)
└── index.ts                   # Re-exports everything
```
