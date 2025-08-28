import { createApp, type App } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: {
        template: "<div>Test Space</div>",
      },
    },
  ],
});

/**
 * Helper function to test Vue Query composables in isolation.
 *
 * ```typescript
 * const [query, app, queryClient] = withVueQuery(() =>
 *   useQuery(getContact(contactId)),
 * );
 * await query.refetch();
 * expect(query.data.value).toEqual(mockContact);
 * ```
 */
export function withVueQuery<T>(
  composable: () => T,
  queryClient?: any, // TODO: Make this QueryClient instead
): [T, App<Element>, any] {
  let result!: T;
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

  const app = createApp({
    setup() {
      result = composable();
      return () => {};
    },
  });

  app.use(VueQueryPlugin, { queryClient: client });
  app.use(router);
  app.mount(document.createElement("div"));

  return [result, app, client];
}
