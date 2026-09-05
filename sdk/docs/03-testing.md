# Testing

SDK request modules are thin wrappers around typed HTTP calls — the valuable tests are focused on **caching** and **invalidation** behavior.

## Query composables

TanStack functions must run inside a Vue setup context. Use [`withVueQuery`](./ref/@saflib/sdk/testing/functions/withVueQuery.md):

```ts
import { useQuery } from "@tanstack/vue-query";
import { withVueQuery } from "@saflib/sdk/testing";
import { getRecipeQuery } from "./get-recipe.ts";

const recipeId = ref(1);
const [query] = withVueQuery(() => useQuery(getRecipeQuery(recipeId)));
await query.refetch();
expect(query.data.value).toEqual(/* … */);
```

Pass a custom `QueryClient` when you need specific defaults; otherwise `withVueQuery` creates one with retries disabled.

## MSW and fakes

Prefer MSW handlers from the SDK fake graph over mocking `useQuery` — see [Fakes](./04-fakes.md).

In request `*.test.ts` files:

```ts
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { recipesFakeHandlers } from "./index.fakes.ts";

describe("getRecipeQuery", () => {
  setupMockServer(recipesFakeHandlers);
  // withVueQuery + assertions…
});
```

## SDK component tests

Product SDK packages expose [`test-app.ts`](https://github.com/sderickson/saflib/blob/main/base/service/sdk/test-app.ts) — a thin wrapper around [`mountWithPlugins`](../../vue/docs/ref/@saflib/vue/testing/functions/mountWithPlugins.md) with SDK i18n and router. SPA page tests follow [@saflib/vue — Testing](../../vue/docs/04-testing.md); SDK component tests use the same MSW pattern with `mountTestApp` from `./test-app.ts`.
