# Testing TanStack Query Integration

This guide focuses on how to effectively test your TanStack Query integration in a SAF-powered Vue SPA. The emphasis is on integration and cache behavior—testing how queries and mutations interact, how cache is invalidated, and how the UI responds to real-world usage patterns. For reference, see the comprehensive integration tests in `call-series.test.ts` and `schedule-rule.test.ts`.

## Table of Contents

- [Testing Setup](#testing-setup)
- [Using OpenAPI Spec Types](#using-openapi-spec-types)
- [Integration Test Patterns](#integration-test-patterns)
  - [Testing Query/Mutation Interactions](#testing-querymutation-interactions)
  - [Testing Cache Invalidation](#testing-cache-invalidation)
  - [Testing Refetching and State](#testing-refetching-and-state)
- [Best Practices](#best-practices)

## Testing Setup

To test TanStack Query integration, set up a proper environment using the `withVueQuery` helper from `@saflib/vue-spa/testing`. This provides a QueryClient and a Vue app context for your tests.

```typescript
import { withVueQuery } from "@saflib/vue-spa/testing";

const [mutation, app, queryClient] = withVueQuery(() => useCreateFeature());
const [query] = withVueQuery(() => useQuery(getFeature()));
```

Always unmount the app after each test:

```typescript
app.unmount();
```

## Using OpenAPI Spec Types

Always use types generated from your OpenAPI spec for request/response bodies and mock data. This ensures type safety and consistency between your API and tests.

```typescript
import type {
  GetFeatureResponse,
  CreateFeatureBody,
  UpdateFeatureBody,
} from "./feature.js";

// Use types for mock data
const mockResponse: GetFeatureResponse = {
  items: [
    {
      id: 1,
      name: "Feature 1",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
  ],
};

// Use types in MSW handlers
const handlers = [
  http.post("/api/feature", async ({ request }) => {
    const body = (await request.json()) as CreateFeatureBody;
    return HttpResponse.json({
      item: {
        ...body,
        id: 1,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      },
    });
  }),
];

// Use types in mutation tests
const newFeature: CreateFeatureBody = {
  name: "New Feature",
};
await mutation.mutateAsync(newFeature);
```

## Integration Test Patterns

### Testing Query/Mutation Interactions

The most valuable tests are those that simulate real user flows: create, update, and delete operations, and how they affect the cache and UI. For example:

```typescript
// call-series.test.ts
it("should create a call series and invalidate queries", async () => {
  const [createMutation, app, queryClient] = withVueQuery(() =>
    useCreateCallSeries(),
  );
  const [query] = withVueQuery(() => useQuery(getCallSeries()));

  // Initial fetch
  await query.refetch();
  expect(query.data.value?.call_series).toHaveLength(2);

  // Create new call series
  await createMutation.mutateAsync({
    /* ... */
  });

  // Cache should be invalidated
  const cachedData = queryClient.getQueryData(["call-series"]);
  expect(cachedData).toBeUndefined();

  app.unmount();
});
```

### Testing Cache Invalidation

Test that mutations properly invalidate or remove cached queries, and that subsequent queries refetch as expected. For example, after a mutation, override the GET endpoint to return updated data and verify that the query data matches the updated response.

```typescript
// schedule-rule.test.ts
it("should update a schedule rule and update data", async () => {
  const [updateMutation, app] = withVueQuery(() => useUpdateScheduleRule());
  const id = ref(1);
  const [query] = withVueQuery(() => useQuery(getCallSeriesById(id)));

  // Wait for initial fetch
  await query.refetch();
  expect(query.data.value?.call_series).toBeDefined();

  // Update schedule rule
  const updateData: UpdateScheduleRuleBody = {
    freq: "WEEKLY",
    byWeekday: ["TU", "TH"],
    byHour: 10,
    byMinute: 30,
  };

  // Override the get endpoint to return updated data
  const updatedResponse = {
    call_series: mockCallSeries,
    schedule_rules: [
      {
        ...updateData,
        id: 1,
        series_id: 1,
      },
    ],
    scheduled_calls: [],
  };

  // Set up the handler before the mutation
  server.use(
    http.get("http://api.localhost:3000/call-series/1", () => {
      return HttpResponse.json(updatedResponse);
    }),
  );

  await updateMutation.mutateAsync({
    params: { id: 1, ruleId: 1 },
    body: updateData,
  });

  // Refetch after mutation
  await query.refetch();
  expect(query.data.value).toEqual(updatedResponse);

  app.unmount();
});
```

### Testing Refetching and State

Test that after cache invalidation, queries refetch and the UI state updates accordingly. You can also test error states and loading indicators by mocking network responses.

## Best Practices

- **Use OpenAPI spec types:** Always use types generated from your OpenAPI spec for request/response bodies and mock data.
- **Test at the integration level:** Focus on how queries and mutations interact, not just isolated query logic.
- **Use real cache keys:** Always use the same query keys as your app to ensure cache invalidation works as expected.
- **Check cache state:** Use `queryClient.getQueryData` to assert cache presence or absence after mutations.
- **Simulate user flows:** Chain queries and mutations in your tests to mimic real usage.
- **Always unmount:** Clean up the Vue app after each test to avoid memory leaks.

For more examples, see:

- `clients/api-requests/call-series.test.ts`
- `clients/api-requests/schedule-rule.test.ts`

For TanStack Query docs, see: [TanStack Query Testing Documentation](https://tanstack.com/query/latest/docs/vue/guides/testing)
