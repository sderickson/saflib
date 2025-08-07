import { createApp, type App } from "vue";
import {
  VueQueryPlugin,
  QueryClient,
  type UseQueryReturnType,
  type UseMutationReturnType,
} from "@tanstack/vue-query";
import { setupServer } from "msw/node";
import { HttpHandler } from "msw";
import { beforeAll, afterAll, afterEach } from "vitest";

/**
 * Helper function to test Vue Query composables in isolation
 *
 * @param composable - The composable function to test
 * @param queryClient - Optional custom query client
 * @returns A tuple containing the composable result, the Vue app instance, and the query client
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
 * Type guard to check if a result is a UseQueryReturnType
 */
export function isQueryResult<TData = unknown, TError = Error>(
  result: unknown,
): result is UseQueryReturnType<TData, TError> {
  return (
    result !== null &&
    typeof result === "object" &&
    "data" in result &&
    "refetch" in result
  );
}

/**
 * Type guard to check if a result is a UseMutationReturnType
 */
export function isMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
  TContext = unknown,
>(
  result: unknown,
): result is UseMutationReturnType<TData, TError, TVariables, TContext> {
  return (
    result !== null &&
    typeof result === "object" &&
    "mutate" in result &&
    "mutateAsync" in result
  );
}

// NETWORKING MOCK HELPERS -----------------

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

// Re-export types from @tanstack/vue-query for convenience
export type {
  UseQueryReturnType,
  UseMutationReturnType,
} from "@tanstack/vue-query";
