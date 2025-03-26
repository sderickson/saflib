# Using TanStack Query in Components

This guide focuses on how to effectively use query and mutation functions in your Vue components. It covers common patterns for handling loading states, errors, and dependent data.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Working with Refs](#working-with-refs)
- [Dependent Queries](#dependent-queries)
- [Using Mutations](#using-mutations)
- [Form Handling with Remote Data](#form-handling-with-remote-data)
  - [Working with Array Types](#working-with-array-types)
  - [How `useFormRefForRemoteRef` Works](#how-useformrefforremoteref-works)
  - [Handling Nested Objects](#handling-nested-objects)
  - [Benefits of Using `useFormRefForRemoteRef`](#benefits-of-using-useformrefforremoteref)
  - [When to Use `useFormRefForRemoteRef`](#when-to-use-useformrefforremoteref)
- [Error Handling](#error-handling)
- [Loading States](#loading-states)
- [UI Patterns](#ui-patterns)

## Basic Usage

Once you've created your query functions (see [Adding Queries](./adding-queries.md)), you can use them in your components:

```vue
<script setup lang="ts">
// Use absolute paths from the library root for better maintainability
import { useGetUsers } from "@tasktap/clients/requests/users";

// Destructure the result to get data, loading state, and errors
const { data: users, isLoading, error } = useGetUsers();
</script>

<template>
  <div v-if="isLoading">Loading users...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else>
    <div v-for="user in users" :key="user.id">
      {{ user.name }}
    </div>
  </div>
</template>
```

### Import Best Practices

When importing query functions and composables, use absolute paths from the library root:

```typescript
// ✅ Good: Use absolute paths
import { useGetUsers } from "@tasktap/clients/requests/users";
import { useFormRefForRemoteRef } from "@saflib/vue-spa/composables/forms";

// ❌ Bad: Avoid relative paths
import { useGetUsers } from "../../requests/users";
```

Using absolute paths provides several benefits:

1. **Maintainability**: Paths don't break when files are moved
2. **Clarity**: The source of the import is immediately clear
3. **Consistency**: All imports follow the same pattern
4. **IDE support**: Better autocomplete and navigation

## Working with Refs

When using queries that require parameters, you'll need to pass refs or computed values:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useGetUserProfile } from "../../requests/userProfile";

// Create a ref for the userId
const userId = ref(123);

// Or use a computed value that depends on other data
const computedUserId = computed(() => someOtherData.value?.id || -1);

// Pass the ref to the query function
const { data: profile, isLoading } = useGetUserProfile(userId);

// You can also use the computed value
const { data: computedProfile } = useGetUserProfile(computedUserId);
</script>
```

## Dependent Queries

Often, you'll need to fetch data that depends on the results of another query. Use the `enabled` option to control when dependent queries should run:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useGetUserProfile } from "../../requests/userProfile";
import { useGetUserPosts } from "../../requests/userPosts";
import { useVerifyAuth } from "../../requests/auth";

// First query - get the authenticated user
const {
  data: authData,
  isLoading: isAuthLoading,
  error: authError,
} = useVerifyAuth();

// Create a computed ref for userId
const userId = computed(() => authData.value?.id || -1);

// Only enable the profile query when we have a valid userId
const fetchProfileEnabled = computed(() => userId.value !== -1);

// Second query - depends on userId
const {
  data: profile,
  isLoading: isProfileLoading,
  error: profileError,
} = useGetUserProfile(userId, {
  enabled: fetchProfileEnabled,
});

// Third query - depends on both userId and profile
const fetchPostsEnabled = computed(
  () => userId.value !== -1 && !!profile.value,
);

// This query will only run when both userId is valid and profile is loaded
const {
  data: userPosts,
  isLoading: isPostsLoading,
  error: postsError,
} = useGetUserPosts(userId, {
  enabled: fetchPostsEnabled,
});

// Combined loading state
const isLoading = computed(
  () => isAuthLoading.value || isProfileLoading.value || isPostsLoading.value,
);
</script>

<template>
  <div v-if="isLoading">Loading data...</div>
  <div v-else-if="authError">Authentication error: {{ authError.message }}</div>
  <div v-else-if="profileError">Profile error: {{ profileError.message }}</div>
  <div v-else-if="postsError">Posts error: {{ postsError.message }}</div>
  <div v-else>
    <!-- Display data when everything is loaded -->
    <user-profile :profile="profile" />
    <user-posts :posts="userPosts" />
  </div>
</template>
```

### Key Points for Dependent Queries

1. Use `computed` properties to derive values from query results
2. Use the `enabled` option to control when queries should run
3. Create a combined loading state for a better user experience
4. Handle errors for each query separately

## Using Mutations

Mutations allow you to update data on the server. Here's how to use them in your components:

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import {
  useGetUserProfile,
  useUpdateUserProfile,
} from "../../requests/userProfile";
import { useVerifyAuth } from "../../requests/auth";
import type { RequestSchema } from "@tasktap/specs-apis";

// Get the authenticated user's ID
const { data: authData } = useVerifyAuth();
const userId = computed(() => authData.value?.id || -1);

// Get user profile
const { data: profile, isLoading: isProfileLoading } = useGetUserProfile(
  userId,
  {
    enabled: computed(() => userId.value !== -1),
  },
);

// Setup mutation
const updateProfile = useUpdateUserProfile();
const isSaving = computed(() => updateProfile.isPending.value);
const saveError = computed(() => updateProfile.error.value);

// Form data
const editedProfile = ref({});
const isEditMode = ref(false);

// Initialize form when entering edit mode
const enterEditMode = () => {
  editedProfile.value = { ...profile.value };
  isEditMode.value = true;
};

// Cancel editing
const cancelEdit = () => {
  isEditMode.value = false;
  editedProfile.value = {};
};

// Save profile changes
const saveProfile = async () => {
  try {
    await updateProfile.mutateAsync({
      userId,
      profileData: editedProfile.value as RequestSchema<"updateUserProfile">,
    });

    // Reset edit mode on success
    isEditMode.value = false;

    // No need to manually refetch - cache invalidation handles this
  } catch (err) {
    // Error handling is done via the mutation's error state
    console.error("Failed to update profile:", err);
  }
};
</script>

<template>
  <div v-if="isProfileLoading">Loading profile...</div>
  <div v-else-if="profile">
    <!-- View mode -->
    <div v-if="!isEditMode">
      <h1>{{ profile.name }}</h1>
      <p>{{ profile.bio }}</p>
      <button @click="enterEditMode">Edit Profile</button>
    </div>

    <!-- Edit mode -->
    <form v-else @submit.prevent="saveProfile">
      <div v-if="saveError" class="error">Error: {{ saveError.message }}</div>

      <input v-model="editedProfile.name" placeholder="Name" />
      <textarea v-model="editedProfile.bio" placeholder="Bio"></textarea>

      <div class="actions">
        <button type="button" @click="cancelEdit" :disabled="isSaving">
          Cancel
        </button>
        <button type="submit" :disabled="isSaving">
          {{ isSaving ? "Saving..." : "Save" }}
        </button>
      </div>
    </form>
  </div>
</template>
```

### Key Points for Mutations

1. Use `isPending` to show loading state during mutation
2. Handle errors from the mutation
3. Reset UI state after successful mutation
4. No need to manually refetch data - cache invalidation handles this

## Form Handling with Remote Data

When building forms that need to sync with remote data, use the `useFormRefForRemoteRef` composable:

> **Note:** For comprehensive guidance on form design patterns, including best practices for component structure and separation of concerns, see the [Form Design Patterns](./forms.md) guide.

```vue
<script setup lang="ts">
import { useAuthedSettings } from "@tasktap/clients/requests/userSettings";
import { useFormRefForRemoteRef } from "@saflib/vue-spa/composables/forms";
import type { components } from "@tasktap/specs-apis/dist/openapi";

// Define the type to match the API schema
type ExperienceLevel = components["schemas"]["settings"]["experienceLevel"];

// Use our custom composable to get authenticated settings
const { settings, isLoading, isSaving, updateUserSettings } =
  useAuthedSettings();

// Initialize form value from settings data if available
// Always provide a default value as the third parameter
const selectedOption = useFormRefForRemoteRef<
  typeof settings.value,
  ExperienceLevel
>(settings, (data) => data?.experienceLevel, "NEW_TO_ME");

// Handle form submission
const handleSubmit = async () => {
  if (selectedOption.value) {
    try {
      // Save the form value to the user's settings
      await updateUserSettings({
        experienceLevel: selectedOption.value as ExperienceLevel,
      });

      // Navigate or show success message
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }
};
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <form v-else @submit.prevent="handleSubmit">
    <select v-model="selectedOption">
      <option value="BEGINNER">Beginner</option>
      <option value="INTERMEDIATE">Intermediate</option>
      <option value="ADVANCED">Advanced</option>
    </select>

    <button type="submit" :disabled="!selectedOption || isSaving">
      {{ isSaving ? "Saving..." : "Save" }}
    </button>
  </form>
</template>
```

### Handling Nested Objects

When working with complex nested objects using `useFormRefForRemoteRef`, you need to be careful about how you modify the data. The refs returned by this composable are readonly reactive objects, which means direct nested mutations are disallowed.

Here are some best practices for handling nested objects:

#### 1. Create Deep Copies for Editing

When you need to edit a nested object, create a deep copy using `JSON.parse(JSON.stringify())`:

```typescript
// Define your complex type
interface Employment {
  title: string;
  company: string;
  startDate: {
    month: number;
    year: number;
  };
  endDate: {
    month: number;
    year: number;
  };
  // other properties...
}

// Initialize from profile data
const employmentHistory = useFormRefForRemoteRef<
  typeof profile.value,
  Employment[]
>(profile, (data) => data?.employmentHistory || [], []);

// For editing, create a deep copy
const currentEmployment = ref<Employment>({
  /* default values */
});

// When opening an edit modal
const openEditModal = (index: number) => {
  // Create a deep copy to avoid reactivity issues with nested objects
  currentEmployment.value = JSON.parse(
    JSON.stringify(employmentHistory.value[index]),
  );
  // other setup...
};
```

#### 2. Replace the Entire Object When Saving

When saving changes to a nested object, replace the entire object rather than trying to modify properties directly:

```typescript
const handleSave = async () => {
  if (isEditing) {
    // Replace the entire object at the specified index
    employmentHistory.value = employmentHistory.value.map(
      (employment, index) => {
        if (index === editingIndex.value) {
          // Create a fresh copy to ensure reactivity works correctly
          return JSON.parse(JSON.stringify(currentEmployment.value));
        }
        return employment;
      },
    );
  } else {
    // Add a new item to the array
    employmentHistory.value = [
      ...employmentHistory.value,
      JSON.parse(JSON.stringify(currentEmployment.value)),
    ];
  }

  // Save to the API
  try {
    await updateUserProfile({
      employmentHistory: employmentHistory.value,
    });
  } catch (error) {
    console.error("Failed to save:", error);
  }
};
```

#### 3. Avoid Direct Nested Mutations

Avoid code patterns like these, which attempt to directly modify nested properties:

```typescript
// ❌ This won't work reliably with nested objects
employmentHistory.value[index].startDate.month = 3;

// ❌ This might also cause reactivity issues
const employment = employmentHistory.value[index];
employment.startDate.month = 3;
employmentHistory.value[index] = employment;
```

Instead, always create a new copy and replace the entire object:

```typescript
// ✅ Create a copy, modify it, then replace the entire object
const updatedEmployment = JSON.parse(
  JSON.stringify(employmentHistory.value[index]),
);
updatedEmployment.startDate.month = 3;
employmentHistory.value = employmentHistory.value.map((item, i) =>
  i === index ? updatedEmployment : item,
);
```

#### 4. Consider Using Immutable Update Patterns

For complex nested updates, consider using immutable update patterns or libraries like immer:

```typescript
// Example with manual immutable updates
const toggleCurrentRole = (index: number) => {
  employmentHistory.value = employmentHistory.value.map((employment, i) => {
    if (i === index) {
      return {
        ...employment,
        isCurrentRole: !employment.isCurrentRole,
        // If setting to current role, we might want to clear the end date
        ...(employment.isCurrentRole
          ? {}
          : {
              endDate: { month: 0, year: new Date().getFullYear() },
            }),
      };
    }
    return employment;
  });
};
```

### How `useFormRefForRemoteRef` Works

The `useFormRefForRemoteRef` composable:

1. Takes a remote data reference and a selector function to extract a specific property
2. Creates a local form reference that syncs with the remote data
3. Watches for changes in the remote data and updates the form value accordingly
4. Requires a default value to ensure the form is always initialized properly

```typescript
// Type signature
function useFormRefForRemoteRef<T, K>(
  remoteRef: Ref<T | undefined>,
  selector: (data: T) => K | undefined,
  defaultValue: K,
): Ref<K>;
```

### Benefits of Using `useFormRefForRemoteRef`

1. **Automatic synchronization**: Form values are automatically initialized from remote data
2. **Type safety**: The form value has the correct type
3. **Simplicity**: No need to manually set up watchers for remote data changes
4. **Consistency**: All forms using this composable will behave consistently
5. **Separation of concerns**: Data synchronization logic is separated from component logic
6. **Default values**: Always provides a sensible default when remote data is not available

### When to Use `useFormRefForRemoteRef`

Use this composable when:

1. You need to initialize form fields from remote data
2. You want to maintain local form state that doesn't immediately update the server
3. You need to handle the case where remote data is loading or not yet available
4. You need to provide a default value when remote data is not available

## Error Handling

Proper error handling is crucial for a good user experience:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useGetUserProfile } from "../../requests/userProfile";
import { useVerifyAuth } from "../../requests/auth";

// Auth-related data and errors
const {
  data: authData,
  isLoading: isAuthLoading,
  error: authError,
  refetch: refetchAuth,
} = useVerifyAuth();

const userId = computed(() => authData.value?.id || -1);

// Profile-related data and errors
const {
  data: profile,
  isLoading: isProfileLoading,
  error: profileError,
  refetch: refetchProfile,
} = useGetUserProfile(userId, {
  enabled: computed(() => userId.value !== -1),
});

// Combined loading state
const isLoading = computed(() => isAuthLoading.value || isProfileLoading.value);
</script>

<template>
  <!-- Auth error state -->
  <v-alert v-if="authError" type="error" title="Authentication Error">
    You must be logged in to view this page.
    <template #append>
      <v-btn @click="refetchAuth">Retry</v-btn>
      <v-btn to="/login">Login</v-btn>
    </template>
  </v-alert>

  <!-- Loading state -->
  <v-progress-circular
    v-else-if="isLoading"
    indeterminate
  ></v-progress-circular>

  <!-- Profile error state -->
  <v-alert v-else-if="profileError" type="error" title="Error loading profile">
    {{ profileError.message || "Failed to load profile data" }}
    <template #append>
      <v-btn @click="refetchProfile">Retry</v-btn>
    </template>
  </v-alert>

  <!-- Content when data is available -->
  <div v-else-if="profile">
    <!-- Your UI here -->
  </div>
</template>
```

### Error Handling Best Practices

1. Handle different types of errors separately (auth errors, data errors, etc.)
2. Provide clear error messages to the user
3. Offer retry functionality when appropriate
4. Redirect to login for authentication errors

## Loading States

Managing loading states properly improves user experience:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useGetUserProfile } from "../../requests/userProfile";

const userId = ref(123);

const {
  data: profile,
  isLoading,
  isFetching,
  isError,
  error,
} = useGetUserProfile(userId);

// isFetching is true during any background refetches
// isLoading is only true during the initial load
const showSkeleton = computed(() => isLoading.value);
const showSpinner = computed(() => !isLoading.value && isFetching.value);
</script>

<template>
  <!-- Initial loading - show skeleton -->
  <profile-skeleton v-if="showSkeleton" />

  <!-- Data is loaded but refreshing - show spinner -->
  <div v-else>
    <div v-if="showSpinner" class="refresh-indicator">
      <v-progress-circular size="small" indeterminate></v-progress-circular>
    </div>

    <!-- Error state -->
    <v-alert v-if="isError" type="error">
      {{ error.message }}
    </v-alert>

    <!-- Content -->
    <profile-display v-if="profile" :profile="profile" />
  </div>
</template>
```

### Loading State Types

- `isLoading`: True during the initial load when no data is available
- `isFetching`: True during any data fetching, including background refetches
- `isRefetching`: True when data is being refetched in the background

## UI Patterns

Here are some common UI patterns for working with queries:

### 1. Data Table with Pagination

```vue
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useGetUsers } from "../../requests/users";

const page = ref(1);
const pageSize = ref(10);

const {
  data: usersResponse,
  isLoading,
  error,
  refetch,
} = useGetUsers(
  computed(() => ({
    page: page.value,
    pageSize: pageSize.value,
  })),
);

// Extract users and pagination info
const users = computed(() => usersResponse.value?.items || []);
const totalUsers = computed(() => usersResponse.value?.total || 0);
const totalPages = computed(() => Math.ceil(totalUsers.value / pageSize.value));

// Change page
const goToPage = (newPage) => {
  page.value = newPage;
};
</script>

<template>
  <div>
    <v-data-table
      :items="users"
      :loading="isLoading"
      :items-per-page="pageSize"
    >
      <!-- Table columns -->
    </v-data-table>

    <v-pagination
      v-model="page"
      :length="totalPages"
      :disabled="isLoading"
    ></v-pagination>
  </div>
</template>
```

### 2. Infinite Scroll

```vue
<script setup lang="ts">
import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { client } from "../../requests/client";

const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
  useInfiniteQuery({
    queryKey: ["posts", "infinite"],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await client.GET("/posts", {
        params: {
          query: { page: pageParam, limit: 10 },
        },
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage || undefined;
    },
  });

// Flatten the pages into a single array
const posts = computed(() => {
  return data.value?.pages.flatMap((page) => page.items) || [];
});

// Load more function for infinite scroll
const loadMore = () => {
  if (hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage();
  }
};
</script>

<template>
  <div>
    <div v-if="isLoading">Loading...</div>

    <div v-else>
      <div v-for="post in posts" :key="post.id" class="post">
        {{ post.title }}
      </div>

      <div v-if="hasNextPage" class="load-more">
        <button @click="loadMore" :disabled="isFetchingNextPage">
          {{ isFetchingNextPage ? "Loading more..." : "Load more" }}
        </button>
      </div>

      <div v-else class="end-message">No more posts to load</div>
    </div>
  </div>
</template>
```

### 3. Optimistic UI Updates

```vue
<script setup lang="ts">
import { useGetTodos, useToggleTodoStatus } from "../../requests/todos";

const { data: todos } = useGetTodos();
const toggleTodo = useToggleTodoStatus();

const handleToggle = async (todo) => {
  await toggleTodo.mutateAsync({
    todoId: todo.id,
    completed: !todo.completed,
  });
  // No need to refetch - the cache is automatically updated
};
</script>

<template>
  <div>
    <div v-for="todo in todos" :key="todo.id" class="todo-item">
      <input
        type="checkbox"
        :checked="todo.completed"
        @change="handleToggle(todo)"
        :disabled="toggleTodo.isPending.value"
      />
      <span :class="{ completed: todo.completed }">
        {{ todo.title }}
      </span>
    </div>
  </div>
</template>
```

## Conclusion

TanStack Query provides a powerful way to manage server state in your Vue components. By following these patterns, you can create a smooth user experience with proper loading states, error handling, and data updates.

Key takeaways:

1. Use absolute import paths from the library root for better maintainability
2. Leverage composable queries to bundle related functionality
3. Use `useFormRefForRemoteRef` for form fields that need to sync with remote data
4. Handle loading and error states appropriately
5. Implement proper UI patterns for different data states

For more information, refer to:

- [Adding Queries Guide](./adding-queries.md) - How to implement query functions
- [Query Testing Guide](./query-testing.md) - How to test your queries
- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/vue/overview)
