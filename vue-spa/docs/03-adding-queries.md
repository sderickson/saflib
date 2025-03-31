# TanStack Queries

This guide focuses on how to implement query and mutation functions for TanStack Query in your application.

## Table of Contents

- [Query Function Structure](#query-function-structure)
- [Mutation Function Structure](#mutation-function-structure)
- [Type Safety](#type-safety)
- [Error Handling](#error-handling)
- [Query Keys](#query-keys)
- [Cache Invalidation](#cache-invalidation)
- [Common Patterns](#common-patterns)
- [Composable Queries](#composable-queries)

## Query Function Structure

Query functions should follow a consistent pattern to ensure maintainability and type safety:

```typescript
// requests/users.ts
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { ResponseSchema } from "@tasktap/specs-apis";
import { Ref } from "vue";

/**
 * Hook to fetch a list of users
 */
export const useGetUsers = (
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await client.GET("/users", {});

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getUsers">;
    },
    ...options,
  });
};
```

### Path Parameters in URLs

When working with path parameters in URLs, do NOT use template literals to construct the URL. Instead, use the path parameter syntax with the `params.path` object:

```typescript
// INCORRECT - Don't use template literals for URLs
const { data, error } = await client.GET(`/users/${userId}`, {});

// CORRECT - Use path parameter syntax
const { data, error } = await client.GET("/users/{userId}", {
  params: {
    path: { userId: String(userId) },
  },
});
```

This approach ensures type safety and proper URL encoding of parameters.

### Using Parameters with Refs

When your query needs parameters, use Vue's `Ref` type:

```typescript
// requests/userProfile.ts
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { ResponseSchema } from "@tasktap/specs-apis";
import { Ref } from "vue";

/**
 * Hook to fetch a user's profile
 * @param userId Ref to the user ID
 * @param options Additional query options
 */
export const useGetUserProfile = (
  userId: Ref<number>,
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  return useQuery({
    // Include the ref directly in the queryKey
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      // Access the .value inside the queryFn
      // IMPORTANT: Use path parameter syntax, not template literals
      const { data, error } = await client.GET("/users/{userId}/profile", {
        params: {
          path: { userId: userId.value },
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getUserProfile">;
    },
    ...options,
  });
};
```

### Query with Query Parameters

For queries that need query parameters:

```typescript
// requests/searchUsers.ts
import { useQuery, UseQueryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { ResponseSchema } from "@tasktap/specs-apis";
import { Ref, computed } from "vue";

/**
 * Hook to search for users
 * @param searchParams Ref to search parameters
 * @param options Additional query options
 */
export const useSearchUsers = (
  searchParams: Ref<{
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }>,
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  // Create a computed queryKey that updates when searchParams changes
  const queryKey = computed(() => ["users", "search", searchParams.value]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await client.GET("/users/search", {
        params: {
          query: searchParams.value,
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"searchUsers">;
    },
    ...options,
  });
};
```

### Key Points for Queries

1. Use `Ref<T>` for parameters that may change
2. Include parameters in the `queryKey` to ensure proper cache management
3. Access `.value` inside the `queryFn`, not in the `queryKey`
4. Always handle errors from the API client
5. Use proper type assertions with `ResponseSchema<T>`
6. Allow passing additional options to customize query behavior

## Mutation Function Structure

Mutations follow a similar pattern but use `useMutation` instead:

```typescript
// requests/userProfile.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client";
import type { RequestSchema, ResponseSchema } from "@tasktap/specs-apis";
import { Ref } from "vue";

/**
 * Hook to update a user's profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      profileData,
    }: {
      userId: Ref<number>;
      profileData: RequestSchema<"updateUserProfile">;
    }) => {
      const { data, error } = await client.PATCH("/users/{userId}/profile", {
        params: {
          path: { userId: userId.value },
        },
        body: profileData,
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"updateUserProfile">;
    },
    // Automatically invalidate related queries after successful mutation
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
    },
  });
};
```

### Key Points for Mutations

1. Use `useMutation` instead of `useQuery`
2. Define a clear interface for mutation parameters
3. Use `Ref<T>` for parameters that may change
4. Implement `onSuccess` to invalidate related queries
5. Handle errors from the API client
6. Use proper type assertions with `RequestSchema<T>` and `ResponseSchema<T>`

## Type Safety

Ensure type safety by using the API schema types:

```typescript
import type { RequestSchema, ResponseSchema } from "@tasktap/specs-apis";

// For request bodies
const body = data as RequestSchema<"updateUserProfile">;

// For response data
return data as ResponseSchema<"getUserProfile">;
```

## Error Handling

Always handle errors from the API client:

```typescript
const { data, error } = await client.GET("/users", {});

if (error) {
  // Option 1: Throw the error to be caught by TanStack Query
  throw error;

  // Option 2: Transform the error
  throw new Error(`Failed to fetch users: ${error.message}`);
}

return data;
```

## Query Keys

Query keys are crucial for proper caching. Follow these guidelines:

1. **Structure**: Use an array with increasing specificity

   ```typescript
   queryKey: ["users"]; // All users
   queryKey: ["users", userId]; // Specific user
   queryKey: ["users", "search", searchParams.value]; // Search results
   ```

2. **Reactivity**: Include reactive values directly in the queryKey

   ```typescript
   queryKey: ["userProfile", userId]; // userId is a Ref<number>
   ```

3. **Consistency**: Use the same key structure across related queries and mutations

## Cache Invalidation

Properly invalidate the cache after mutations:

```typescript
// Basic invalidation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["users"] });
};

// Targeted invalidation
onSuccess: (_, { userId }) => {
  queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });

  // You can also invalidate related queries
  queryClient.invalidateQueries({ queryKey: ["userPosts", userId] });
};

// Invalidate with predicate
onSuccess: () => {
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "users" && query.queryKey.length > 1,
  });
};
```

### Optimistic Updates

For a better user experience, you can update the cache optimistically:

```typescript
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, profileData }) => {
      // ... same as before
    },
    // Update the cache optimistically before the server responds
    onMutate: async ({ userId, profileData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["userProfile", userId] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(["userProfile", userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(["userProfile", userId], (old) => ({
        ...old,
        ...profileData,
      }));

      // Return a context object with the snapshot
      return { previousProfile };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, { userId }, context) => {
      queryClient.setQueryData(
        ["userProfile", userId],
        context.previousProfile,
      );
    },
    // Always refetch after error or success
    onSettled: (_, __, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
    },
  });
};
```

## Common Patterns

### 1. Queries with Filters

```typescript
export const useGetFilteredTasks = (
  filters: Ref<{
    status?: string;
    priority?: string;
    assignee?: number;
  }>,
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  // Create a computed queryKey that updates when filters change
  const queryKey = computed(() => ["tasks", "filtered", filters.value]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await client.GET("/tasks", {
        params: {
          query: filters.value,
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getTasks">;
    },
    ...options,
  });
};
```

### 2. Dependent Queries

```typescript
// This query depends on the result of another query
export const useGetUserPosts = (
  userId: Ref<number>,
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["userPosts", userId],
    queryFn: async () => {
      const { data, error } = await client.GET("/users/{userId}/posts", {
        params: {
          path: { userId: userId.value },
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getUserPosts">;
    },
    // This query will only run when enabled is true
    // The component using this query should set enabled based on
    // whether the dependent data is available
    ...options,
  });
};
```

### 3. Infinite Queries

```typescript
export const useGetInfinitePosts = (
  options?: Omit<
    UseInfiniteQueryOptions,
    "queryKey" | "queryFn" | "getNextPageParam"
  >,
) => {
  return useInfiniteQuery({
    queryKey: ["posts", "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const { data, error } = await client.GET("/posts", {
        params: {
          query: { page: pageParam, limit: 10 },
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getPosts">;
    },
    getNextPageParam: (lastPage) => {
      // Return undefined when there are no more pages
      return lastPage.nextPage || undefined;
    },
    ...options,
  });
};
```

### 4. Optimistic Updates

```typescript
export const useToggleTodoStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      todoId,
      completed,
    }: {
      todoId: number;
      completed: boolean;
    }) => {
      const { data, error } = await client.PATCH("/todos/{todoId}", {
        params: {
          path: { todoId },
        },
        body: { completed },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    // Optimistically update the todo item
    onMutate: async ({ todoId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Get the current todos
      const previousTodos = queryClient.getQueryData(["todos"]);

      // Update the cache with the new status
      queryClient.setQueryData(["todos"], (old: any) => {
        return {
          ...old,
          items: old.items.map((todo: any) =>
            todo.id === todoId ? { ...todo, completed } : todo,
          ),
        };
      });

      return { previousTodos };
    },
    // Roll back on error
    onError: (_, __, context) => {
      queryClient.setQueryData(["todos"], context.previousTodos);
    },
    // Refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
};
```

## Composable Queries

One of the most powerful patterns for organizing your API interactions is to create composable functions that bundle related queries and mutations together. This approach provides several benefits:

1. **Simplified component code**: Components can import a single function instead of multiple query/mutation hooks
2. **Encapsulated authentication**: Authentication logic can be handled within the composable
3. **Consistent error handling**: Error handling can be standardized across related operations
4. **Co-located related functionality**: Queries and mutations that operate on the same resource are defined together

### Example: User Settings Composable

Here's an example of a composable that bundles user settings operations:

```typescript
// requests/userSettings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client.js";
import type { RequestSchema, ResponseSchema } from "@tasktap/specs-apis";
import { Ref, computed, ref } from "vue";
import { useVerifyAuth } from "./auth.js";

// Individual query function
export const useGetUserSettings = (
  userId: Ref<number>,
  options?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["userSettings", userId],
    queryFn: async () => {
      const { data, error } = await client.GET("/users/{userId}/settings", {
        params: {
          path: { userId: userId.value },
        },
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"getUserSettings">;
    },
    ...options,
  });
};

// Individual mutation function
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      settingsData,
    }: {
      userId: Ref<number>;
      settingsData: RequestSchema<"updateUserSettings">;
    }) => {
      const { data, error } = await client.PATCH("/users/{userId}/settings", {
        params: {
          path: { userId: userId.value },
        },
        body: settingsData,
      });

      if (error) {
        throw error;
      }

      return data as ResponseSchema<"updateUserSettings">;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["userSettings", userId] });
    },
  });
};

// Composable that bundles authentication, query, and mutation
export function useAuthedSettings() {
  // Get the authenticated user
  const {
    data: authData,
    isLoading: isAuthLoading,
    error: authError,
  } = useVerifyAuth();

  // Create a computed userId from auth data
  const userId = computed(() => authData.value?.id || -1);

  // Only enable settings query when we have a valid userId
  const fetchEnabled = computed(() => userId.value !== -1);

  // Get user settings
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
    refetch,
  } = useGetUserSettings(userId, {
    enabled: fetchEnabled,
  });

  // Setup mutation
  const updateMutation = useUpdateUserSettings();
  const isSaving = computed(() => updateMutation.isPending.value);

  // Combined loading state
  const isLoading = computed(
    () => isAuthLoading.value || isSettingsLoading.value,
  );

  // Combined error state
  const error = computed(() => authError.value || settingsError.value);

  // Wrapper function for the mutation
  const updateUserSettings = async (
    settingsData: RequestSchema<"updateUserSettings">,
  ) => {
    return updateMutation.mutateAsync({
      userId,
      settingsData,
    });
  };

  // Return everything needed by components
  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateUserSettings,
    refetch,
  };
}
```

### Using the Composable in Components

Components can now use this composable with minimal code:

```vue
<script setup lang="ts">
import { useAuthedSettings } from "@/requests/userSettings";

// Get everything we need with a single function call
const { settings, isLoading, isSaving, error, updateUserSettings } =
  useAuthedSettings();

// Use the settings data and update function as needed
</script>
```

### Key Benefits of Composable Queries

1. **Simplified API**: Components only need to import and use a single function
2. **Encapsulated complexity**: Authentication, loading states, and error handling are managed internally
3. **Type safety**: All return values are properly typed
4. **Reusability**: The same composable can be used across multiple components
5. **Maintainability**: Related functionality is defined in one place
6. **Testability**: The composable can be tested as a unit

### When to Use Composable Queries

Consider creating composable queries when:

1. You have related queries and mutations that operate on the same resource
2. You need to handle authentication for protected resources
3. You want to simplify component code by providing a unified API
4. You need to combine multiple loading or error states
5. You have complex dependencies between queries

## Conclusion

Following these patterns will help you create consistent, type-safe, and maintainable query and mutation functions. Remember to:

1. Use `Ref<T>` for parameters that may change
2. Include parameters in the `queryKey` for proper caching
3. Handle errors from the API client
4. Use proper type assertions
5. Implement cache invalidation for mutations
6. Consider optimistic updates for a better user experience
7. Bundle related queries and mutations into composable functions
8. Use absolute import paths for better maintainability
9. **Always use path parameter syntax with `params.path` for URL parameters, not template literals**
10. **Always include an empty object `{}` as the second parameter when there are no params**

For more information, refer to:

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
