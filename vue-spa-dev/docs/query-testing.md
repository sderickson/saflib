# Test TanStack

This guide focuses on how to effectively test your TanStack Query functions, including both queries and mutations.

## Table of Contents

- [Testing Setup](#testing-setup)
- [Testing Basic Queries](#testing-basic-queries)
- [Testing Queries with Parameters](#testing-queries-with-parameters)
- [Testing Mutations](#testing-mutations)
- [Testing Error Handling](#testing-error-handling)
- [Testing Cache Interactions](#testing-cache-interactions)
- [Testing in Components](#testing-in-components)

## Testing Setup

To test TanStack Query functions, you need to set up a proper testing environment. Make sure this package is included as a dependency in your own, then you can import the `withVueQuery` function included in `@saflib/vue-spa`.

```typescript
import { withVueQuery } from "@saflib/vue-spa/test-utils/requests.ts";

// then within your test:
const [result, app] = withVueQuery(() => yourQuery());
```

### Important Notes About Vue Query Results

When testing TanStack Query functions in Vue, remember these crucial points:

1. Query and mutation results are Vue refs - always use `.value` to access their properties:

```typescript
// ❌ Wrong - will fail
expect(result.isSuccess).toBe(true);
expect(result.data).toEqual(expectedData);

// ✅ Correct - accessing the ref values
expect(result.isSuccess.value).toBe(true);
expect(result.data.value).toEqual(expectedData);
```

2. Always clean up by unmounting the app after each test:

```typescript
const [result, app] = withVueQuery(() => yourQuery());
// ... test code ...
app.unmount(); // Don't forget this!
```

3. For mutations, prefer `mutateAsync` over `mutate` in tests to ensure the mutation completes:

```typescript
// ❌ Less reliable - might not wait for completion
await result.mutate(data);

// ✅ Better - ensures mutation completes
await result.mutateAsync(data);
```

4. When testing mutation errors, use `expect().rejects` with `mutateAsync`:

```typescript
// ❌ Less reliable - might miss the error
await result.mutate(data);
expect(result.isError.value).toBe(true);

// ✅ Better - ensures we catch the error
await expect(result.mutateAsync(data)).rejects.toThrow();
expect(result.isError.value).toBe(true);
```

5. Remember to wait for queries to complete:

```typescript
// Set up the query
const [result, app] = withVueQuery(() => useYourQuery());

// ❌ Wrong - might test before query completes
expect(result.data.value).toEqual(expectedData);

// ✅ Correct - wait for query to complete
await waitForQueries();
expect(result.data.value).toEqual(expectedData);
```

## Testing Basic Queries

Here's how to test a basic query function:

```typescript
// requests/users.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGetUsers } from "./users";
import { client } from "./client";
import { withVueQuery, waitForQueries } from "../test-utils/requests";

// Mock the client
vi.mock("./client", () => ({
  client: {
    GET: vi.fn(),
  },
}));

describe("users requests", () => {
  const mockGET = client.GET as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch users", async () => {
    // Mock the response
    const mockUsers = [
      { id: 1, name: "User 1" },
      { id: 2, name: "User 2" },
    ];
    mockGET.mockResolvedValueOnce({ data: mockUsers, error: null });

    // Set up the query with our helper
    const [result, app] = withVueQuery(() => useGetUsers());

    // Wait for the query to complete
    await waitForQueries();

    // Assert
    expect(mockGET).toHaveBeenCalledWith("/users");
    expect(result.data.value).toEqual(mockUsers);

    // Clean up
    app.unmount();
  });
});
```

## Testing Queries with Parameters

For queries that take parameters, especially refs:

```typescript
// requests/userProfile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGetUserProfile } from "./userProfile";
import { client } from "./client";
import { withVueQuery, waitForQueries } from "../test-utils/requests";
import { ref } from "vue";

// Mock the client
vi.mock("./client", () => ({
  client: {
    GET: vi.fn(),
  },
}));

describe("userProfile requests", () => {
  const mockGET = client.GET as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch user profile with ref parameter", async () => {
    // Mock the response
    const mockProfile = { name: "Test User", email: "test@example.com" };
    mockGET.mockResolvedValueOnce({ data: mockProfile, error: null });

    // Use a ref for userId
    const userId = ref(123);

    // Set up the query with our helper
    const [result, app] = withVueQuery(() => useGetUserProfile(userId));

    // Wait for the query to complete
    await waitForQueries();

    // Assert
    expect(mockGET).toHaveBeenCalledWith("/users/{userId}/profile", {
      params: {
        path: { userId: userId.value },
      },
    });
    expect(result.data.value).toEqual(mockProfile);

    // Test that changing the ref triggers a refetch
    mockGET.mockResolvedValueOnce({
      data: { ...mockProfile, name: "Updated User" },
      error: null,
    });

    // Change the ref value
    userId.value = 456;

    // Wait for the query to refetch
    await waitForQueries();

    // Assert the new call
    expect(mockGET).toHaveBeenCalledWith("/users/{userId}/profile", {
      params: {
        path: { userId: 456 },
      },
    });

    // Clean up
    app.unmount();
  });

  it("should respect the enabled option", async () => {
    // Mock the response
    mockGET.mockResolvedValueOnce({ data: { name: "Test User" }, error: null });

    // Use a ref for userId and enabled
    const userId = ref(123);
    const enabled = ref(false);

    // Set up the query with our helper
    const [result, app] = withVueQuery(() =>
      useGetUserProfile(userId, { enabled }),
    );

    // Wait for any potential queries
    await waitForQueries();

    // Assert that the query was not called when disabled
    expect(mockGET).not.toHaveBeenCalled();
    expect(result.isLoading.value).toBe(false);

    // Enable the query
    enabled.value = true;

    // Wait for the query to execute
    await waitForQueries();

    // Assert that the query was called after enabling
    expect(mockGET).toHaveBeenCalledTimes(1);

    // Clean up
    app.unmount();
  });
});
```

## Testing Mutations

Testing mutations requires checking both the mutation function and its side effects:

```typescript
// requests/userProfile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUpdateUserProfile } from "./userProfile";
import { client } from "./client";
import { withVueQuery, waitForQueries } from "../test-utils/requests";
import { ref } from "vue";
import { QueryClient } from "@tanstack/vue-query";

// Mock the client
vi.mock("./client", () => ({
  client: {
    PATCH: vi.fn(),
  },
}));

describe("userProfile mutations", () => {
  const mockPATCH = client.PATCH as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update user profile", async () => {
    // Mock the response
    const mockResponse = { success: true };
    mockPATCH.mockResolvedValueOnce({ data: mockResponse, error: null });

    // Create a QueryClient for testing
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Spy on the invalidateQueries method
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Set up the mutation with our helper
    const [result, app] = withVueQuery(
      () => useUpdateUserProfile(),
      queryClient,
    );

    // Use a ref for userId
    const userId = ref(123);
    const profileData = { name: "Updated Name", bio: "New bio" };

    // Execute the mutation
    await result.mutateAsync({
      userId,
      profileData,
    });

    // Assert
    expect(mockPATCH).toHaveBeenCalledWith("/users/{userId}/profile", {
      params: {
        path: { userId: userId.value },
      },
      body: profileData,
    });

    // Check that the cache was invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["userProfile", userId],
    });

    // Check mutation state
    expect(result.isSuccess.value).toBe(true);
    expect(result.data.value).toEqual(mockResponse);

    // Clean up
    app.unmount();
  });

  it("should handle mutation errors", async () => {
    // Mock an error response
    const mockError = { message: "Update failed", status: 400 };
    mockPATCH.mockResolvedValueOnce({ data: null, error: mockError });

    // Set up the mutation with our helper
    const [result, app] = withVueQuery(() => useUpdateUserProfile());

    // Execute the mutation and expect it to throw
    const userId = ref(123);
    const profileData = { name: "Updated Name" };

    await expect(
      result.mutateAsync({
        userId,
        profileData,
      }),
    ).rejects.toThrow();

    // Assert error state
    expect(result.isError.value).toBe(true);
    expect(result.error.value).toBeDefined();

    // Clean up
    app.unmount();
  });
});
```

## Testing Error Handling

Test how your queries and mutations handle errors:

```typescript
// requests/users.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGetUsers } from "./users";
import { client } from "./client";
import { withVueQuery, waitForQueries } from "../test-utils/requests";

// Mock the client
vi.mock("./client", () => ({
  client: {
    GET: vi.fn(),
  },
}));

describe("users requests error handling", () => {
  const mockGET = client.GET as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle API errors", async () => {
    // Mock an error response
    const mockError = { message: "API Error", status: 500 };
    mockGET.mockResolvedValueOnce({ data: null, error: mockError });

    // Set up the query with our helper
    const [result, app] = withVueQuery(() => useGetUsers());

    // Wait for the query to complete
    await waitForQueries();

    // Assert
    expect(mockGET).toHaveBeenCalledWith("/users");
    expect(result.error.value).toEqual(mockError);
    expect(result.isError.value).toBe(true);
    expect(result.data.value).toBeUndefined();

    // Clean up
    app.unmount();
  });

  it("should handle network errors", async () => {
    // Mock a network error
    const networkError = new Error("Network Error");
    mockGET.mockRejectedValueOnce(networkError);

    // Set up the query with our helper
    const [result, app] = withVueQuery(() => useGetUsers());

    // Wait for the query to complete
    await waitForQueries();

    // Assert
    expect(mockGET).toHaveBeenCalledWith("/users");
    expect(result.error.value).toBe(networkError);
    expect(result.isError.value).toBe(true);

    // Clean up
    app.unmount();
  });
});
```

## Testing Cache Interactions

Test how your queries interact with the cache:

```typescript
// requests/users.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGetUsers } from "./users";
import { client } from "./client";
import { withVueQuery, waitForQueries } from "../test-utils/requests";
import { QueryClient } from "@tanstack/vue-query";

// Mock the client
vi.mock("./client", () => ({
  client: {
    GET: vi.fn(),
  },
}));

describe("users requests caching", () => {
  const mockGET = client.GET as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use cached data and not refetch", async () => {
    // Create a QueryClient for testing
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Prefill the cache
    const mockUsers = [{ id: 1, name: "User 1" }];
    queryClient.setQueryData(["users"], mockUsers);

    // Set up the query with our helper and the prefilled QueryClient
    const [result, app] = withVueQuery(() => useGetUsers(), queryClient);

    // Wait for any potential queries
    await waitForQueries();

    // Assert that the data comes from cache and no fetch was made
    expect(mockGET).not.toHaveBeenCalled();
    expect(result.data.value).toEqual(mockUsers);

    // Clean up
    app.unmount();
  });

  it("should refetch when stale time is exceeded", async () => {
    // Mock the response
    const mockUsers = [{ id: 1, name: "User 1" }];
    mockGET.mockResolvedValueOnce({ data: mockUsers, error: null });

    // Create a QueryClient with a very short stale time
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 10, // 10ms stale time
        },
      },
    });

    // Set up the query with our helper
    const [result, app] = withVueQuery(() => useGetUsers(), queryClient);

    // Wait for the initial query
    await waitForQueries();
    expect(mockGET).toHaveBeenCalledTimes(1);

    // Mock the second response
    const updatedUsers = [{ id: 1, name: "Updated User" }];
    mockGET.mockResolvedValueOnce({ data: updatedUsers, error: null });

    // Wait for the stale time to pass
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Trigger a refetch
    await result.refetch();

    // Wait for the refetch
    await waitForQueries();

    // Assert that a second fetch was made
    expect(mockGET).toHaveBeenCalledTimes(2);
    expect(result.data.value).toEqual(updatedUsers);

    // Clean up
    app.unmount();
  });
});
```

## Testing in Components

When testing components that use TanStack Query, you need to provide a QueryClient:

```typescript
// components/__tests__/UserProfile.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import UserProfile from "../UserProfile.vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { client } from "../../requests/client";

// Mock the client
vi.mock("../../requests/client", () => ({
  client: {
    GET: vi.fn(),
  },
}));

describe("UserProfile.vue", () => {
  const mockGET = client.GET as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display user profile data", async () => {
    // Mock the response
    const mockProfile = { name: "Test User", email: "test@example.com" };
    mockGET.mockResolvedValueOnce({ data: mockProfile, error: null });

    // Create a QueryClient for testing
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mount the component with the QueryClient
    const wrapper = mount(UserProfile, {
      props: {
        userId: 123,
      },
      global: {
        plugins: [[VueQueryPlugin, { queryClient }], createTestingPinia()],
      },
    });

    // Initially should show loading state
    expect(wrapper.text()).toContain("Loading");

    // Wait for the query to complete
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // Should display the profile data
    expect(wrapper.text()).toContain("Test User");
    expect(wrapper.text()).toContain("test@example.com");

    // Verify the API was called correctly
    expect(mockGET).toHaveBeenCalledWith("/users/{userId}/profile", {
      params: {
        path: { userId: 123 },
      },
    });
  });

  it("should handle errors", async () => {
    // Mock an error response
    const mockError = { message: "Profile not found", status: 404 };
    mockGET.mockResolvedValueOnce({ data: null, error: mockError });

    // Create a QueryClient for testing
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mount the component with the QueryClient
    const wrapper = mount(UserProfile, {
      props: {
        userId: 999,
      },
      global: {
        plugins: [[VueQueryPlugin, { queryClient }], createTestingPinia()],
      },
    });

    // Wait for the query to complete
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // Should display the error message
    expect(wrapper.text()).toContain("Profile not found");
    expect(wrapper.find(".error-message").exists()).toBe(true);
  });
});
```

## Conclusion

Testing TanStack Query functions requires a proper setup to handle the asynchronous nature of queries and mutations. By following these patterns, you can ensure your query functions work correctly and handle various scenarios appropriately.

For more information, refer to:

- [Adding Queries Guide](./adding-queries.md) - How to implement query functions
- [Using Queries Guide](./using-queries.md) - How to use queries in components
- [TanStack Query Testing Documentation](https://tanstack.com/query/latest/docs/vue/guides/testing)
