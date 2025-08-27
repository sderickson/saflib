import { createApp, type App } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { setupServer } from "msw/node";
import { HttpHandler, HttpResponse } from "msw";
import { beforeAll, afterAll, afterEach } from "vitest";
import { http } from "msw";
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

type ExtractRequestBody<Op extends Record<string, any>> =
  Op["requestBody"] extends {
    content: { "application/json": any };
  }
    ? Op["requestBody"]["content"]["application/json"]
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
    handler: (request: {
      params: ExtractRequestParams<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >;
      body: ExtractRequestBody<
        Paths[P][V] extends Record<string, any> ? Paths[P][V] : never
      >;
    }) => Promise<
      | ExtractResponseBody<
          Paths[P][V] extends Record<string, any> ? Paths[P][V] : never,
          S
        >
      | undefined
    >;
  }) => {
    // translate instances of "{id}" (the openapi spec format) with ":id" (the msw format)
    const pathString = String(path).replace(/{(\w+)}/g, ":$1");
    return http[verb as keyof typeof http](
      `http://${subdomain}.localhost:3000${pathString}`,
      async (request) => {
        let body: any;
        if (verb === "post" || verb === "put" || verb === "patch") {
          try {
            body = await request.request.json();
          } catch (e) {
            body = undefined;
          }
        }
        const params = { ...request.params };
        for (const key in params) {
          if (key.toLowerCase().endsWith("id")) {
            // @ts-expect-error - coercing to number
            params[key] = parseInt(params[key]);
          }
        }
        return HttpResponse.json(
          await handler({
            params,
            body,
          }),
          { status },
        );
      },
    );
  };
  return { createHandler };
};
