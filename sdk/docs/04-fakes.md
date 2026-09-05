# Fakes

SDK packages own **typed MSW handlers** for their OpenAPI surface so SPAs and SDK tests share one fake backend. See [best practices — ownership of mocks](../../best-practices.md#ownership-of-mocks-fakes-shims).

[`typedCreateHandler`](./ref/@saflib/sdk/testing/functions/typedCreateHandler.md) enforces request/response types from the spec. Bind it once in `test/typed-fake.ts`:

```ts
import { typedCreateHandler } from "@saflib/sdk/testing";
import type { paths } from "@scope/product-spec";

export const { createHandler: baseHandler } = typedCreateHandler<paths>();
```

Each operation's `{operation}.fake.ts` uses `baseHandler({ path, verb, status, handler })`.

**Query and path params in handlers are always `string` or `string[]`** — compare with string literals (`query.publicOnly === "true"`, not `=== true`).

Prefer seeding `mocks.ts` from product `*-test` factories (`@scope/product-test/factories/*`) when models already have factories — keep `mocks.ts` as the mutable store, not a second hand-built schema.

Optional scenario handler lists can prepend baseline handlers for one-off cases (verified vs unverified user, empty list, etc.).

For page-level tests that mount Vue components, see [@saflib/vue — Network mocking](../../vue/docs/04-testing.md#network-mocking).
