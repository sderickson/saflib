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
import { useQuery } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "./types";
import { Ref } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to fetch a list of users
 */
export const useGetUsers = () => {
  return useQuery<AuthResponse["listUsers"][200], TanstackError>({
    queryKey: ["users"],
    queryFn: () => handleClientMethod(client.GET("/users", {})),
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
import { useQuery } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "./types";
import { Ref } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to fetch a user's profile
 * @param userId Ref to the user ID
 */
export const useGetUserProfile = (userId: Ref<number>) => {
  return useQuery<AuthResponse["getUserProfile"][200], TanstackError>({
    queryKey: ["userProfile", userId],
    queryFn: () =>
      handleClientMethod(
        client.GET("/users/{userId}/profile", {
          params: { path: { userId: userId.value } },
        }),
      ),
    enabled: !!userId.value,
  });
};
```

### Key Points for Queries

1. Use `Ref<T>` for parameters that may change reactively.
2. Include parameters (Refs or their `.value` depending on context) in the `queryKey`.
3. Access reactive `.value` properties inside the `queryFn`.
4. **Use the `handleClientMethod` helper to wrap your API client calls.**
5. Use specific generated types (e.g., `AuthResponse["operationId"][statusCode]`) for success data and `TanstackError` for the error type in `useQuery` generics.
6. Use the `enabled` option directly within the hook if a query depends on a parameter having a value.

## Mutation Function Structure

Mutations use `useMutation` and `handleClientMethod`:

```typescript
// requests/userProfile.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthRequest, AuthResponse } from "./types";
import { Ref } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";

/**
 * Hook to update a user's profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AuthResponse["updateUserProfile"][200],
    TanstackError,
    { userId: Ref<number>; profileData: AuthRequest["updateUserProfile"] }
  >({
    mutationFn: ({ userId, profileData }) =>
      handleClientMethod(
        client.PATCH("/users/{userId}/profile", {
          params: { path: { userId: userId.value } },
          body: profileData,
        }),
      ),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
    },
  });
};
```

### Key Points for Mutations

1. Use `useMutation` instead of `useQuery`.
2. Define the generic types for `useMutation`: `TData`, `TError` (`TanstackError`), and `TVariables`.
3. Use `Ref<T>` in `TVariables` if parameters might change reactively, accessing `.value` inside `mutationFn`.
4. Use `handleClientMethod` to wrap the API client call within `mutationFn`.
5. Implement `onSuccess`, `onError`, or `onSettled` directly within the hook for side effects like cache invalidation.
6. Use specific generated types (e.g., `AuthResponse`, `AuthRequest`) for request bodies and responses.

## Type Safety

Ensure type safety by using the specific types generated from your OpenAPI schema and `TanstackError`.

```typescript
import type { AuthRequest, AuthResponse } from "./types";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import { useQuery, useMutation } from "@tanstack/vue-query";
import { Ref } from "vue";

// Example Query Typing
export const useSomeQuery = (itemId: Ref<string>) => {
  return useQuery<AuthResponse["getSomeItem"][200], TanstackError>({
    queryKey: ["someItem", itemId],
    queryFn: () =>
      handleClientMethod(
        client.GET("/items/{itemId}", {
          params: { path: { itemId: itemId.value } },
        }),
      ),
    enabled: !!itemId.value,
  });
};

// Example Mutation Typing
export const useUpdateSomeItem = () => {
  return useMutation<
    AuthResponse["updateSomeItem"][200],
    TanstackError,
    { itemId: string; updateData: AuthRequest["updateSomeItem"] }
  >({
    mutationFn: ({ itemId, updateData }) =>
      handleClientMethod(
        client.PUT("/items/{itemId}", {
          params: { path: { itemId } },
          body: updateData,
        }),
      ),
    onSuccess: (_data, { itemId }) => {
      console.log(`Item ${itemId} updated`);
    },
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

Providing explicit types to `useQuery` and `useMutation` enhances type checking and autocompletion.

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

Invalidate the cache after mutations using `queryClient.invalidateQueries` within the `onSuccess` callback defined directly in the hook.

```typescript
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import type { AuthRequest, AuthResponse } from "./types";
import { Ref } from "vue";

export type DeleteUserResponse = AuthResponse["deleteUser"][200];

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteUserResponse, TanstackError, { userId: number }>({
    mutationFn: ({ userId }) => {
      return handleClientMethod(
        client.DELETE("/users/{userId}", {
          params: { path: { userId } },
        }),
      );
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.removeQueries({ queryKey: ["users", userId] });
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

Use the `enabled` option directly within the hook to run a query only when its dependencies are met.

```typescript
import { useQuery } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "./types";
import { Ref, computed } from "vue";
import { handleClientMethod, TanstackError } from "@saflib/vue-spa";
import { useVerifyAuth } from "./auth";

export const useUserPosts = (userId: Ref<number | undefined>) => {
  const isEnabled = computed(() => typeof userId.value === "number");

  return useQuery<AuthResponse["getUserPosts"][200], TanstackError>({
    queryKey: ["userPosts", userId],
    queryFn: () => {
      if (typeof userId.value !== "number") {
        // This should ideally not be hit due to `enabled` check
        return Promise.resolve({ posts: [] });
      }
      return handleClientMethod(
        client.GET("/users/{userId}/posts", {
          params: { path: { userId: userId.value } },
        }),
      );
    },
    enabled: isEnabled.value,
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
3.  Provide explicit generic types (`TData`, `TError`, `TVariables`) to `useQuery` and `useMutation` using your generated API types and `TanstackError`.
4.  Use `Ref<T>` for reactive parameters.
5.  Structure `queryKey` arrays logically and include reactive dependencies.
6.  Use `queryClient.invalidateQueries` or other `queryClient` methods in mutation `onSuccess` (or `onError`/`onSettled`) callbacks defined directly within the hook for cache management.
7.  Leverage the `enabled` option directly within hooks for dependent queries.
8.  Handle errors caught by TanStack Query using the `error` state.
9.  **Always use path parameter syntax (`params.path`) for URL parameters.**
10. Pass an empty object `{}` as the second argument to client methods if no parameters are needed.

For more details, refer to:

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
- Your generated API type definitions.
- The `handleClientMethod` and `TanstackError` implementation in `@saflib/vue-spa`.
