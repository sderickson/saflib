# TanStack Queries

This guide focuses on how to implement query and mutation functions for TanStack Query in your application using the `handleClientMethod` helper.

## Table of Contents

- [Query Function Structure](#query-function-structure)
  - [Using `queryOptions`](#using-queryoptions)
  - [Using Queries in Components](#using-queries-in-components)
- [Mutation Function Structure](#mutation-function-structure)
- [Error Handling](#error-handling)
- [Conclusion](#conclusion)

## Query Function Structure

The recommended way to define reusable query configurations is using `queryOptions`. This function encapsulates the `queryKey` and `queryFn`, promoting consistency and better organization.

### Using `queryOptions`

```typescript
// requests/users.ts
import { queryOptions } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthResponse } from "@saflib/identity-specs"; // Import from appropriate spec package
import { handleClientMethod } from "@saflib/vue-spa"; // Helper for wrapping openapi-fetch client methods
import type { Ref } from "vue";

// Export the specific response type for clarity
export type ListUsersResponse = AuthResponse["listUsers"][200];

/**
 * Query options to fetch a list of users
 */
export const listUsers = queryOptions({
  queryKey: ["users"],
  queryFn: () => handleClientMethod(client.GET("/users", {})),
  // `handleClientMethod` implicitly returns Promise<ListUsersResponse>
});

/**
 * Query options to fetch a user's profile by ID
 * @param userId Ref to the user ID
 */
export type GetUserProfileResponse = AuthResponse["getUserProfile"][200];

export const getUserProfileQueryOptions = (userId: Ref<number | undefined>) => {
  return queryOptions({
    queryKey: ["userProfile", userId], // Include the Ref
    queryFn: () => {
      return handleClientMethod(
        client.GET("/users/{userId}/profile", {
          params: { path: { userId: userId.value } },
        }),
      );
    },
    // `handleClientMethod` implicitly returns Promise<GetUserProfileResponse>
    enabled: !!userId.value, // Use enabled to prevent running if userId is not set
  });
};
```

### Using Queries in Components

You use the options defined above with `useQuery` in your components:

````vue
<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  listUsers,
  getUserProfileQueryOptions,
} from "@saflib/web-app-client/src/requests/users.ts";
import { ref, computed } from "vue";

// Example 1: Fetching all users
const {
  data: usersData,
  error: usersError,
  isLoading: usersLoading,
} = useQuery(listUsers);
// usersData is inferred as ListUsersResponse | undefined
// usersError is inferred as TanstackError | null

// Example 2: Fetching a specific user profile (conditionally enabled)
const selectedUserId = ref<number | undefined>(undefined); // e.g., from route params or selection
const profileOptions = computed(() =>
  getUserProfileQueryOptions(selectedUserId),
);
const {
  data: profileData,
  error: profileError,
  isLoading: profileLoading,
} = useQuery(profileOptions);

// Function to set the user ID (e.g., on button click)
function loadProfile(id: number) {
  selectedUserId.value = id;
}
</script>

<template>
  <div>
    <h2>Users</h2>
    <div v-if="usersLoading">Loading users...</div>
    <div v-else-if="usersError">
      Error loading users: {{ usersError.message }}
    </div>
    <ul v-else-if="usersData">
      <li v-for="user in usersData.users" :key="user.id">
        {{ user.name }}
        <button @click="loadProfile(user.id)">Load Profile</button>
      </li>
    </ul>

    <h2>Profile</h2>
    <div v-if="!selectedUserId">Select a user to load their profile.</div>
    <div v-else-if="profileLoading">Loading profile...</div>
    <div v-else-if="profileError">
      Error loading profile: {{ profileError.message }}
    </div>
    <div v-else-if="profileData">
      <p>Name: {{ profileData.name }}</p>
      <p>Email: {{ profileData.email }}</p>
      <!-- ... other profile details -->
    </div>
  </div>
</template>

### Path Parameters in URLs When working with path parameters in URLs, do NOT
use template literals to construct the URL. Instead, use the path parameter
syntax with the `params.path` object: ```typescript // INCORRECT - Don't use
template literals for URLs const result = await client.GET(`/users/${userId}`,
{}); // CORRECT - Use path parameter syntax const result = await
client.GET("/users/{userId}", { params: { path: { userId: String(userId) }, //
Ensure path params are strings }, });
````

This approach ensures type safety and proper URL encoding of parameters. `handleClientMethod` should wrap the `client.GET` call.

### Key Points for Queries (Using `queryOptions`)

1.  **Use `queryOptions`** to define reusable query configurations (`queryKey`, `queryFn`, `enabled`, etc.).
2.  Export specific response types (e.g., `ListUsersResponse`) alongside the query options for clarity.
3.  Rely on type inference from `handleClientMethod` within `queryFn`. Usually, no explicit `TData` or `TError` generics are needed in `queryOptions`.
4.  Use `Ref<T>` for parameters that may change reactively.
5.  Include reactive parameters (like Refs) directly in the `queryKey` array.
6.  Access reactive `.value` properties inside the `queryFn` when making the API call.
7.  **Use the `handleClientMethod` helper to wrap your API client calls.**
8.  Use the `enabled` option within `queryOptions` if a query depends on a parameter having a value.
9.  Pass the `queryOptions` object (or a computed ref returning it) to `useQuery` in your component.

## Mutation Function Structure

Mutations use `useMutation` and `handleClientMethod`. It's recommended to define the `mutationFn` separately for clarity.

```typescript
// requests/userProfile.ts
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "./client";
import type { AuthRequest, AuthResponse } from "./types"; // Assuming central types
import { handleClientMethod } from "@saflib/vue-spa";
import type { Ref } from "vue";

// Export request body and response types
export type UpdateUserProfileBody = AuthRequest["updateUserProfile"];
export type UpdateUserProfileResponse = AuthResponse["updateUserProfile"][200];

/**
 * Hook to update a user's profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  // Define the mutation function separately
  const mutationFn = ({
    userId,
    profileData,
  }: {
    userId: number; // Assuming ID is stable when mutation is called
    profileData: UpdateUserProfileBody;
  }) => {
    // Access reactive .value here if userId were a Ref and needed at call time
    return handleClientMethod(
      client.PATCH("/users/{userId}/profile", {
        params: { path: { userId } }, // Convert number to string if needed by API spec
        body: profileData,
      }),
    );
  };
  // `handleClientMethod` implicitly returns Promise<UpdateUserProfileResponse>

  return useMutation({
    mutationFn, // Pass the defined function
    // No need for <TData, TError, TVariables> generics if types can be inferred
    onSuccess: (_data, variables) => {
      // Use the 'variables' argument to get userId for invalidation
      queryClient.invalidateQueries({
        queryKey: ["userProfile", variables.userId],
      });
      // Optionally invalidate the list query as well if the update affects it
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    // onError: (error) => { // error is TanstackError
    //   console.error("Profile update failed:", error.message);
    // }
  });
};
```

### Key Points for Mutations

1. Use `useMutation`.
2. Define the actual API call logic within a separate `mutationFn`.
3. Export specific request body and response types (e.g., `UpdateUserProfileBody`, `UpdateUserProfileResponse`) near the hook.
4. Define the input type for `mutationFn` clearly (e.g., using an inline object type or a dedicated `TVariables` type). Use `Ref<T>` if necessary, accessing `.value` inside `mutationFn`.
5. Pass the `mutationFn` to `useMutation`.
6. **Use `handleClientMethod` to wrap the API client call within `mutationFn`.** Rely on its type inference.
7. Often, explicit generics (`TData`, `TError`, `TVariables`) on `useMutation` are not needed if TypeScript can infer them from `mutationFn` and `onSuccess`/`onError`. `TError` will implicitly be `TanstackError`.
8. Implement `onSuccess`, `onError`, or `onSettled` directly within the `useMutation` options object for side effects like cache invalidation. Use the `variables` argument in these callbacks to access the input passed to the mutation.

Relying on inference from `handleClientMethod` simplifies the hook definitions. Explicit types are primarily needed for the exported request/response/variable types and potentially the `mutationFn` parameters.

## Error Handling

The `handleClientMethod` helper standardizes error handling. It catches errors from `openapi-fetch` (network issues, non-2xx responses) and throws a `TanstackError`.

```typescript
// Simplified queryFn using handleClientMethod
queryFn: () => {
  // handleClientMethod throws TanstackError on API error
  return handleClientMethod(client.GET("/users", {}));
}; // Return type is inferred, Error type is TanstackError

// Simplified mutationFn using handleClientMethod
const mutationFn = (vars: SomeBodyType) => {
  // handleClientMethod throws TanstackError on API error
  return handleClientMethod(client.POST("/users", { body: vars }));
}; // Return type is inferred, Error type is TanstackError
```

TanStack Query automatically catches the network error and returns a `TanstackError` with only the necessary information to display an error message to the user. You can access this error in your component via the `error` property returned by `useQuery` or `useMutation`, or handle it using the `onError` callback in the query/mutation options. The `TanstackError` object contains `status` (HTTP status code) and `code` (optional API error code) properties for more specific error handling in the UI.

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

## Conclusion

Following these core patterns with `handleClientMethod` will help you create consistent, type-safe, and maintainable query and mutation functions:

1.  **Use `queryOptions`** to define reusable query configurations. Use `useQuery` in components with these options.
2.  Use `useMutation` for data modification, defining the core logic in a separate `mutationFn`.
3.  **Wrap all `openapi-fetch` client calls in `handleClientMethod`**.
4.  **Rely on type inference** from `handleClientMethod`. Explicit generics on `queryOptions` and `useMutation` are often unnecessary. `TanstackError` is handled implicitly as the error type.
5.  Export specific request/response types (e.g., `ListUsersResponse`, `UpdateUserBody`) near the hooks/options for clarity and reuse.
6.  Handle errors caught by TanStack Query using the `error` state in components (`error` will be typed as `TanstackError | null`).

For more details, refer to:

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
- [TanStack Query `queryOptions`](https://tanstack.com/query/latest/docs/vue/reference/queryOptions)
- Your generated API type definitions.
- The `handleClientMethod` and `TanstackError` implementation in `@saflib/vue-spa`.
