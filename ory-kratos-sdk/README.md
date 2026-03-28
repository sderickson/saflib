# @saflib/ory-kratos-sdk

TanStack Query bindings for the [Ory Kratos](https://www.ory.sh/docs/kratos/) browser **Frontend API**: session, self-service flows (create, get by id, submit), and related helpers.

The package wraps `@ory/client` with Vue Query `queryOptions` and mutations. Where Kratos uses **4xx for normal UX** (validation, expired flow, CSRF, “session already available”), those responses are **returned as typed classes** so callers can branch with `instanceof`. Real failures use [`TanstackError`](../../sdk/docs/ref/@saflib/sdk/classes/TanstackError.md) from `@saflib/sdk`.

Importing the package root runs `vue-query-register.ts` so Vue Query’s default error type is `TanstackError` project-wide.

## Entry points

- **`@saflib/ory-kratos-sdk`** — queries, mutations, helpers, and shared flow result types (**authoritative list:** `index.ts`).
- **`@saflib/ory-kratos-sdk/fakes`** — MSW handlers and test doubles for Kratos in unit/integration tests (**authoritative list:** `fakes.ts`).

## Why a separate SDK?

Kratos’s HTTP behavior is not “errors vs 200” in the usual sense:

- **400** often means an **updated flow** to render again.
- **410** means the flow is gone — start a new browser flow.
- **403** may mean **CSRF mismatch** — restart the flow.
- **422** may mean **browser redirect** — follow `redirect_browser_to`.

So a lot of 4xx handling lives **inside** `queryFn` / `mutationFn` and is returned as data, not thrown. Unexpected network/API failures still surface as `TanstackError`.

## Source layout (conventions)

| Location | Idea |
|----------|------|
| `queries/` | One session query, `create-*` browser flows (including logout), `get-*` by flow id. |
| `mutations/` | `useUpdate*FlowMutation` — POST self-service updates. |
| `helpers/` | Pure functions that are not queries. |
| `flow-results.ts` | Shared result classes used across queries/mutations. |
| `get-flow-query-error.ts` | Internal mapping from GET-flow HTTP errors to typed results (not re-exported from the root). |

## Query patterns

**Naming:** each flow typically has **`createXxxFlowQueryOptions` / `useCreateXxxFlowQuery`**, **`getXxxFlowQueryOptions` / `useGetXxxFlowQuery`**, plus small wrapper classes for successful fetches/creates (so `data` is never a raw Kratos object alone).

**Create-flow** queries may resolve to outcomes like “flow created”, “session already available”, or an unmapped client error — see the options’ generic success type in source.

**Get-flow** queries may resolve to “flow fetched”, “gone” (410), “CSRF” (403), or other handled 4xx — again, the declared union on each `queryOptions` is the source of truth.

**Query keys** are an implementation detail: they are **not** part of the stable public API. Prefer `*QueryOptions(...)` for `useQuery` / `fetchQuery`; in tests, derive `.queryKey` from those options if you need to read the cache.

**Imperative `fetchQuery`:** when you must not reuse a cached create (e.g. another step just finished and you need a fresh browser flow with the same `returnTo`), pass **`staleTime: 0`** on that `fetchQuery` call.

## Mutation patterns

Update mutations return **discriminated classes** (updated flow, completed login/registration, redirect required, etc.) instead of throwing for expected Kratos outcomes. They normalize unexpected failures to `TanstackError`. On success, mutations **update flow query cache** and **invalidate session** where appropriate so feature code does not duplicate cache wiring for every submit.

## Typing

Queries and mutations are typed so thrown errors are `TanstackError` where applicable. Use `instanceof` for Kratos result classes and `instanceof TanstackError` (or `@saflib/sdk` helpers) for generic error UI.

## Tests

Use **`@saflib/ory-kratos-sdk/fakes`** together with `@saflib/sdk/testing` (e.g. MSW + `withVueQuery`) like other packages. Exported symbols are listed in `fakes.ts`.

## Apps using this package

Session-only callers should use the **session** query API from this package rather than calling `toSession` ad hoc. **Routing** (`/new-login`, `?flow=`, verify wall, etc.) stays in each application; this SDK focuses on Kratos HTTP + TanStack cache behavior.
