# TanStack Queries

This guide focuses on how to implement query and mutation functions for TanStack Query in your application using the `handleClientMethod` helper.

## Table of Contents

- [Query Function Structure](#query-function-structure)
- [Mutation Function Structure](#mutation-function-structure)
- [Type Safety](#type-safety)
- [Error Handling](#error-handling)
- [Query Keys](#query-keys)
- [Cache Invalidation](#cache-invalidation)
- [Common Patterns](#common-patterns)
- [Conclusion](#conclusion)

## Query Function Structure

Query functions should follow a consistent pattern using `useQuery` and `handleClientMethod`:

```typescript
// requests/users.ts
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
// Import your specific API response/request types generated from OpenAPI
import type { AuthResponse } from "./types";
import { Ref } from "vue";
// Import the helper and custom error type
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to fetch a list of users
 */
export const useGetUsers = (
  options?: Omit<
    UseQueryOptions<
      AuthResponse["listUsers"][200], // Success response type
      TanstackError // Error type
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<AuthResponse["listUsers"][200], TanstackError>({
    queryKey: ["users"],
    queryFn: () => {
      // Use handleClientMethod to automatically handle errors and return data
      return handleClientMethod(client.GET("/users", {}));
    },
    ...options,
  });
};
```

### Path Parameters in URLs

When working with path parameters in URLs, do NOT use template literals to construct the URL. Instead, use the path parameter syntax with the `params.path` object:

```typescript
// INCORRECT - Don't use template literals for URLs
const result = await client.GET(`/users/${userId}`, {});

// CORRECT - Use path parameter syntax
const result = await client.GET("/users/{userId}", {
  params: {
    path: { userId: String(userId) }, // Ensure path params are strings
  },
});
```

This approach ensures type safety and proper URL encoding of parameters. `handleClientMethod` should wrap the `client.GET` call.

### Using Parameters with Refs

When your query needs parameters that might change reactively, use Vue's `Ref` type:

```typescript
// requests/userProfile.ts
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "./types"; // Specific API types
import { Ref } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to fetch a user's profile
 * @param userId Ref to the user ID
 * @param options Additional query options
 */
export const useGetUserProfile = (
  userId: Ref<number>,
  options?: Omit<
    UseQueryOptions<
      AuthResponse["getUserProfile"][200], // Success response type
      TanstackError // Error type
    >,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<AuthResponse["getUserProfile"][200], TanstackError>({
    // Include the ref directly in the queryKey
    queryKey: ["userProfile", userId],
    queryFn: () => {
      // Access the .value inside the queryFn
      // IMPORTANT: Use path parameter syntax, not template literals
      // Use handleClientMethod
      return handleClientMethod(
        client.GET("/users/{userId}/profile", {
          params: {
            path: { userId: userId.value }, // Access .value here
          },
        }),
      );
    },
    ...options,
  });
};
```

### Key Points for Queries

1. Use `Ref<T>` for parameters that may change reactively.
2. Include parameters (Refs or their `.value` depending on context) in the `queryKey` to ensure proper cache management and reactivity.
3. Access reactive `.value` properties inside the `queryFn`, not directly in the `queryKey` definition if using computed keys (though often including the Ref directly is sufficient).
4. **Use the `handleClientMethod` helper to wrap your API client calls.** This handles standard error checking and returns the data directly, simplifying your `queryFn`.
5. Use specific generated types (e.g., `AuthResponse["operationId"][statusCode]`) for success data and `TanstackError` for the error type in `useQuery` generics and options for type safety. `handleClientMethod` infers the success type, but explicitly typing `useQuery` is good practice.
6. Allow passing additional `UseQueryOptions` to customize query behavior (e.g., `enabled`, `staleTime`).

## Mutation Function Structure

Mutations use `useMutation` and `handleClientMethod`:

```typescript
// requests/userProfile.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client";
// Import your specific API response/request types
import type { AuthRequest, AuthResponse } from "./types";
import { Ref } from "vue";
// Import the helper and custom error type
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to update a user's profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AuthResponse["updateUserProfile"][200], // Success response type
    TanstackError, // Error type
    {
      // Variables type (what mutationFn receives)
      userId: Ref<number>;
      profileData: AuthRequest["updateUserProfile"]; // Request body type
    }
  >({
    mutationFn: ({ userId, profileData }) => {
      // Use handleClientMethod
      return handleClientMethod(
        client.PATCH("/users/{userId}/profile", {
          params: {
            path: { userId: userId.value }, // Access .value here
          },
          body: profileData,
        }),
      );
    },
    // Automatically invalidate related queries after successful mutation
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
    },
  });
};
```

### Key Points for Mutations

1. Use `useMutation` instead of `useQuery`.
2. Define the generic types for `useMutation`: `TData` (success response), `TError` (`TanstackError`), and `TVariables` (input parameters).
3. Use `Ref<T>` in `TVariables` if parameters might change reactively, accessing `.value` inside `mutationFn`.
4. Use `handleClientMethod` to wrap the API client call within `mutationFn`.
5. Implement `onSuccess`, `onError`, or `onSettled` for side effects like cache invalidation.
6. Use specific generated types (e.g., `AuthResponse`, `AuthRequest`) for request bodies and responses.

## Type Safety

Ensure type safety by using the specific types generated from your OpenAPI schema and `TanstackError`.

```typescript
import type { AuthRequest, AuthResponse } from "./types"; // Adjust path as needed
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import { useQuery, useMutation, UseQueryOptions } from "@tanstack/vue-query";
import { Ref } from "vue";

// Example Query Typing
export const useSomeQuery = (
  itemId: Ref<string>,
  options?: Omit<
    UseQueryOptions<AuthResponse["getSomeItem"][200], TanstackError>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<AuthResponse["getSomeItem"][200], TanstackError>({
    queryKey: ["someItem", itemId],
    queryFn: () =>
      handleClientMethod(
        client.GET("/items/{itemId}", {
          params: { path: { itemId: itemId.value } },
        }),
      ),
    ...options,
  });
};

// Example Mutation Typing
export const useUpdateSomeItem = () => {
  return useMutation<
    AuthResponse["updateSomeItem"][200], // TData
    TanstackError, // TError
    { itemId: string; updateData: AuthRequest["updateSomeItem"] } // TVariables
  >({
    mutationFn: ({ itemId, updateData }) =>
      handleClientMethod(
        client.PUT("/items/{itemId}", {
          params: { path: { itemId } },
          body: updateData,
        }),
      ),
    // ... other options like onSuccess
  });
};

// Usage in component (type inference works)
const { data, error } = useSomeQuery(ref("abc"));
// data is typed as AuthResponse["getSomeItem"][200] | undefined
// error is typed as TanstackError | null

const mutation = useUpdateSomeItem();
mutation.mutate({
  itemId: "xyz",
  updateData: {
    /* ... */
  },
});
// mutation.error is TanstackError | null
```

Providing these explicit types to `useQuery` and `useMutation` enhances type checking and autocompletion.

## Error Handling

The `handleClientMethod` helper standardizes error handling. It catches errors from `openapi-fetch` (network issues, non-2xx responses) and throws a `TanstackError`.

```typescript
// Simplified queryFn using handleClientMethod
queryFn: () => {
  // handleClientMethod throws TanstackError on API error
  return handleClientMethod(client.GET("/users", {}));
};

// Simplified mutationFn using handleClientMethod
mutationFn: (vars) => {
  // handleClientMethod throws TanstackError on API error
  return handleClientMethod(client.POST("/users", { body: vars }));
};
```

TanStack Query automatically catches the `TanstackError`. You can access this error in your component via the `error` property returned by `useQuery` or `useMutation`, or handle it using the `onError` callback in the query/mutation options. The `TanstackError` object contains `status` (HTTP status code) and `code` (optional API error code) properties for more specific error handling in the UI.

```vue
<script setup lang="ts">
import { useGetUsers } from "@/requests/users";

const { data, error, isLoading } = useGetUsers();
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <!-- Display specific message based on error status or code -->
  <div v-else-if="error">
    <span v-if="error.status === 404">User not found.</span>
    <span v-else-if="error.code === 'SOME_API_CODE'"
      >Specific API error occurred.</span
    >
    <span v-else
      >An error occurred: {{ error.message }} (Status: {{ error.status }})</span
    >
  </div>
  <ul v-else-if="data">
    <li v-for="user in data.users" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

## Query Keys

Query keys are crucial for caching. Follow these guidelines:

1.  **Structure**: Use an array, starting broad and getting more specific.
    ```typescript
    queryKey: ["users"]; // All users
    queryKey: ["users", userId]; // Specific user by ID (userId could be a Ref)
    queryKey: ["users", userId, "profile"]; // Specific user's profile
    ```
2.  **Reactivity**: Include reactive values (like Refs) directly in the `queryKey` array. TanStack Query handles dependencies on Refs automatically.
    ```typescript
    const userId = ref(123);
    queryKey: ["userProfile", userId]; // Correct: Include the Ref
    ```
3.  **Consistency**: Use the same key structure across related queries and for invalidation/updates after mutations.

## Cache Invalidation

Invalidate the cache after mutations using `queryClient.invalidateQueries`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import type { AuthRequest, AuthResponse } from "./types";
import { Ref } from "vue";

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AuthResponse["deleteUser"][204], // Example: 204 No Content
    TanstackError,
    { userId: number }
  >({
    mutationFn: ({ userId }) => {
      return handleClientMethod(
        client.DELETE("/users/{userId}", {
          params: { path: { userId } },
        }),
      );
    },
    onSuccess: (_, { userId }) => {
      // Invalidate all queries starting with 'users'
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // More specific invalidation (if needed, e.g., remove specific user query)
      // queryClient.removeQueries({ queryKey: ['users', userId] });
    },
  });
};
```

### Invalidation Strategies

1.  **Basic Invalidation**: `queryClient.invalidateQueries({ queryKey: ["resource"] })` marks all matching queries as stale, triggering refetches on next access. Good default.
2.  **Targeted Invalidation**: `queryClient.invalidateQueries({ queryKey: ["resource", id] })` targets a specific query instance.
3.  **Predicate Invalidation**: Use a function for complex matching:
    ```typescript
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "users" && query.isActive(),
    });
    ```
4.  **Removing vs. Invalidating**: `removeQueries` deletes the query from the cache immediately. `invalidateQueries` marks it stale for potential refetch. Invalidation is usually preferred.

## Common Patterns

### 1. Dependent Queries

Use the `enabled` option to run a query only when its dependencies are met (e.g., user ID is available after login).

```typescript
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "./types";
import { Ref, computed } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import { useVerifyAuth } from "./auth"; // Assuming an auth hook

export const useUserPosts = (
  // Assume userId might be initially undefined or null from auth state
  userId: Ref<number | undefined>,
  options?: Omit<
    UseQueryOptions<AuthResponse["getUserPosts"][200], TanstackError>,
    "queryKey" | "queryFn" | "enabled" // Exclude enabled from passed options
  >,
) => {
  // Only enable the query if userId has a value
  const isEnabled = computed(() => typeof userId.value === "number");

  return useQuery<AuthResponse["getUserPosts"][200], TanstackError>({
    // Query key can include potentially undefined ref, TanStack handles it
    queryKey: ["userPosts", userId],
    queryFn: () => {
      // Ensure userId.value is valid before making the call, though `enabled` prevents execution if not.
      // Adding a check here provides extra safety or allows returning a default/empty state.
      if (typeof userId.value !== "number") {
        // This path shouldn't be hit if `enabled` is working correctly,
        // but demonstrates defensive coding or returning an empty/default state.
        // Option 1: Throw (if this state is truly exceptional)
        // throw new Error("User ID is required but missing.");
        // Option 2: Return a default/empty value matching the expected type structure
        return Promise.resolve({ posts: [] }); // Adjust based on actual AuthResponse["getUserPosts"][200]
      }
      return handleClientMethod(
        client.GET("/users/{userId}/posts", {
          params: { path: { userId: userId.value } },
        }),
      );
    },
    // Use the computed boolean for the enabled option
    enabled: isEnabled.value,
    ...options, // Spread remaining options
  });
};

// Component Usage:
// const { data: authData } = useVerifyAuth();
// const userId = computed(() => authData.value?.id);
// const { data: postsData, isLoading, error } = useUserPosts(userId);
```

## Conclusion

Following these core patterns with `handleClientMethod` will help you create consistent, type-safe, and maintainable query and mutation functions:

1.  Use `useQuery` for data fetching, `useMutation` for data modification.
2.  **Wrap all `openapi-fetch` client calls in `handleClientMethod`**.
3.  Provide explicit generic types (`TData`, `TError`, `TVariables`) to `useQuery` and `useMutation` using your generated API types (e.g., `AuthResponse`, `AuthRequest`) and `TanstackError`.
4.  Use `Ref<T>` for reactive parameters.
5.  Structure `queryKey` arrays logically and include reactive dependencies.
6.  Use `queryClient.invalidateQueries` in mutation `onSuccess` callbacks for cache management.
7.  Leverage the `enabled` option for dependent queries.
8.  Handle errors caught by TanStack Query using the `error` state (checking `status` and `code` on the `TanstackError`).
9.  **Always use path parameter syntax (`params.path`) for URL parameters, not template literals.**
10. Pass an empty object `{}` as the second argument to client methods (e.g., `client.GET("/path", {})`) if no parameters are needed. `handleClientMethod` takes the _result_ of this call.

For more advanced topics or further details, refer to:

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
- Your generated API type definitions.
- The `handleClientMethod` and `TanstackError` implementation in `@saflib/vue-spa`.
