import { createApp, type App } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { setupServer } from "msw/node";
import { HttpHandler, HttpResponse } from "msw";
import { beforeAll, afterAll, afterEach } from "vitest";
import { http } from "msw";

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
  app.mount(document.createElement("div"));

  return [result, app, client];
}

/**
 * Simple wrapper around `msw`'s `setupServer` function.
 */
export function setupMockServer(handlers: HttpHandler[]) {
  const server = setupServer(...handlers);

  // Start server before all tests
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  // Reset handlers between tests
  afterEach(() => server.resetHandlers());

  // Clean up after all tests
  afterAll(() => server.close());

  return server;
}

type ExtractRequestParams<Op extends Record<string, any>> =
  Op["parameters"] extends {
    path: { [key: string]: any };
  }
    ? Op["parameters"]["path"]
    : never;

type ExtractResponseBody<
  Op extends Record<string, any>,
  StatusCode extends number,
> = Op["responses"][StatusCode] extends {
  content: { "application/json": any };
}
  ? Op["responses"][StatusCode]["content"]["application/json"]
  : never;

/**
 * Use to create a typed helper function for creating typesafe mock API handlers.
 */
export const typedCreateHandler = <Paths extends Record<string, any>>({
  subdomain,
}: {
  subdomain: string;
}) => {
  const createHandler = <
    P extends keyof Paths,
    V extends keyof Paths[P],
    S extends number,
  >({
    path,
    verb,
    status,
    handler,
  }: {
    path: P;
    verb: V;
    status: S;
    handler: (
      params: ExtractRequestParams<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >,
    ) => ExtractResponseBody<
      Paths[P][V] extends Record<string, any> ? Paths[P][V] : never,
      S
    >;
  }) => {
    // translate instances of "{id}" (the openapi spec format) with ":id" (the msw format)
    const pathString = String(path).replace(/{(\w+)}/g, ":$1");
    return http[verb as keyof typeof http](
      `http://${subdomain}.localhost:3000${pathString}`,
      (request) => {
        return HttpResponse.json(handler(request), { status });
      },
    );
  };
  return { createHandler };
};
