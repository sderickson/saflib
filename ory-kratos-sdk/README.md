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

Flow queries live under `queries/` in two shapes per flow:

- **`create-*-flow.ts`** — browser-initiated flows (`useCreateLoginFlowQuery`, etc.), keyed by `returnTo` and related options.
- **`get-*-flow.ts`** — resume an existing flow by id (`useGetLoginFlowQuery`, etc.).

Each file exports `*QueryOptions` (for `useQuery` / `queryClient.fetchQuery`) and a `useGet*` or `useCreate*` wrapper. **Query keys are not part of the public API** — the SDK keeps them for internal cache updates. Tests that assert on cache contents may use `getXxxFlowQueryOptions(args).queryKey` when necessary.

### Typing queries with `TanstackError`

`queryOptions` use explicit error type parameters so `TanstackError` flows through without `as` casts.

### Using queries in loaders

Typical pattern for a page that resumes `?flow=`:

```ts
return {
  loginFlowQuery: useGetLoginFlowQuery({
    flowId: flowId.value,
    enabled: computed(() => !!flowId.value),
  }),
};
```

Pages that start a new browser flow use the matching `useCreate*FlowQuery` from `queries/create-*-flow.ts`.

Imperative code can use `queryClient.fetchQuery(createLoginFlowQueryOptions(...))` with the same keys and `queryFn` as the declarative hook. When a **new** browser flow must be created (e.g. immediately after registration), pass `staleTime: 0` so TanStack does not reuse a still-fresh cached create-login result for the same `returnTo`.

**Logout** uses `queries/create-browser-logout-flow.ts` (`createBrowserLogoutFlowQueryOptions`, `BrowserLogoutFlowCreated`). Call sites typically use `queryClient.fetchQuery({ ...options, staleTime: 0 })` so each sign-out gets a fresh logout URL.

## Mutations

Mutations live under `mutations/` as `useUpdateXxxFlowMutation`. They follow two rules:

1. **Expected responses are returned, not thrown.** Kratos 4xx responses that are part of the normal flow lifecycle (validation errors, browser redirects) are caught in the `mutationFn` and returned as success values.
2. **Unexpected errors are normalized to `TanstackError`.** Any AxiosError that isn't an expected response is converted to `TanstackError(status)` and thrown.

### Result types

Distinct outcomes use classes so consumers can branch with `instanceof` (for example `LoginFlowUpdated`, `LoginCompleted`, `RegistrationFlowUpdated`).

### Cache and session

`onSuccess` in these mutations updates the relevant flow query cache when a flow is returned, and invalidates Kratos session queries when a flow completes or session-affecting state changes. Callers normally do not call `setQueryData` for flow updates themselves.

### Error type

Mutations declare `TanstackError` as the error type. Consumers can use `error instanceof TanstackError` and `getTanstackErrorMessage(error)` for generic display.
