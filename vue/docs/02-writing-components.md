# Vue Components

## Component Organization

### File Structure

- Place components in appropriate directories based on their scope:
  - `shared/components/` for reusable components
  - `shared/state/` for shared reactive state
  - `pages/` for route-level components
  - Feature-specific directories for related components (e.g., `blog/` for blog-related components)

### Component Naming

- Use PascalCase for component file names (e.g., `BlogListPage.vue`)
- Use PascalCase for component names in template

## Using Vuetify

### Layout Components

- Use Vuetify's layout components instead of custom CSS:
  ```vue
  <v-container>
    <v-row>
      <v-col>
        <!-- Content -->
      </v-col>
    </v-row>
  </v-container>
  ```

### Typography

- Use Vuetify's typography classes instead of custom CSS:
  ```vue
  <h1 class="text-h3">Title</h1>
  <p class="text-body-1">Body text</p>
  <div class="text-caption">Small text</div>
  ```

### Spacing

- Use Vuetify's spacing utilities:
  ```vue
  <div class="ma-4">Margin all 4</div>
  <div class="pa-6">Padding all 6</div>
  <div class="mb-4">Margin bottom 4</div>
  ```

### Colors and Emphasis

- Use Vuetify's color system:
  ```vue
  <div class="text-primary">Primary color</div>
  <div class="text-medium-emphasis">Secondary text</div>
  ```

### Responsive Design

- Use Vuetify's grid system for responsive layouts:
  ```vue
  <v-col cols="12" sm="6" md="4" lg="3">
    <!-- Content -->
  </v-col>
  ```

### Components

- Use Vuetify components instead of custom implementations:

  ```vue
  <!-- Instead of custom card -->
  <v-card>
    <v-card-text>
      <!-- Content -->
    </v-card-text>
  </v-card>

  <!-- Instead of custom button -->
  <v-btn color="primary" :to="'/route'">
    Button Text
  </v-btn>
  ```

## Avoiding Custom CSS

### When to Use Custom CSS

- Only when Vuetify doesn't provide a suitable solution
- For complex animations
- For brand-specific styling that can't be achieved with Vuetify's theming

### When to Avoid Custom CSS

- For basic layouts (use Vuetify's grid system)
- For typography (use Vuetify's typography classes)
- For spacing (use Vuetify's spacing utilities)
- For colors (use Vuetify's color system)
- For common components (use Vuetify components)

## Component Configuration

### Centralized Configuration

- Use configuration files for shared data:

  ```typescript
  // blog-list.ts
  export interface BlogPost {
    title: string;
    date: string;
    excerpt: string;
    slug: string;
    component: typeof BlogPostComponent;
  }

  export const blogPosts: BlogPost[] = [
    // Post configurations
  ];
  ```

### Dynamic Routing

- Generate routes from configuration:
  ```typescript
  routes: [
    ...blogPosts.map((post) => ({
      path: `/blog/${post.slug}`,
      name: post.slug,
      component: post.component,
    })),
  ];
  ```

## Code Organization

### Script Setup

- Use `<script setup lang="ts">` for simpler component logic
- Define interfaces and types in separate files
- Import shared configurations from dedicated files

### Template Structure

- Keep templates clean and readable
- Use meaningful component and class names
- Break down complex templates into smaller components

### Props and Events

- Define prop types explicitly
- Use TypeScript for better type safety
- Follow Vue's naming conventions for events

### Data Management

- Use reactive state for application state, tanstack query for data fetching
- Keep component state minimal
- Use computed properties for derived data

#### Async Loader Pattern for Pages

To handle asynchronous data loading for page components gracefully, especially when relying on Tanstack Query (Vue Query), we use a standardized pattern involving a loader function, an async wrapper component, and the main page component. This pattern utilizes the shared `AsyncPage` component available in `@saflib/vue`.

**Benefits:**

- **Separation of Concerns**: Isolates loading and error UI state from the main page logic.
- **Reliant on Caching**: Leverages Tanstack Query's caching by calling the loader in both the async wrapper (for state checks) and the page component (for data access).
- **Handles Multiple Queries**: The pattern supports pages requiring data from multiple API calls.
- **Prevents Component Setup Before Load**: Ensures the main page component's `setup` function only runs after the initial data fetch is successful (or data is available from cache).

**Structure:**

1.  **Loader (`MyPage.loader.ts`)**: Defines a function using `useQuery` (or multiple `useQuery` calls) and returns an array of query results.

    ```typescript
    // src/pages/MyPage/MyPage.loader.ts
    import { useQuery } from "@tanstack/vue-query";
    import { getMyData, getMoreData } from "@/requests/my-api";
    import type { MaybeRef } from "vue";

    export function useMyPageLoader(someId: MaybeRef<number | undefined>) {
      const query1 = useQuery(getMyData(someId));
      const query2 = useQuery(getMoreData()); // Another query if needed

      // Return results as an array
      return [query1, query2];
    }
    ```

2.  **Async Wrapper (`MyPageAsync.vue`)**: Imports `AsyncPage`, the loader, and defines the actual page component using `defineAsyncComponent`. It passes the loader and the async component to `AsyncPage`.

    ```vue
    <!-- src/pages/MyPage/MyPageAsync.vue -->
    <template>
      <AsyncPage :loader="loader" :page-component="MyPage" />
    </template>

    <script setup lang="ts">
    import { defineAsyncComponent, computed } from "vue";
    import { useRoute } from "vue-router";
    import { useMyPageLoader } from "./MyPage.loader.ts";
    import { AsyncPage } from "@saflib/vue";

    const route = useRoute();
    const someId = computed(() => {
      /* extract ID from route.params */
    });

    // Define the actual page component asynchronously
    const MyPage = defineAsyncComponent(() => import("./MyPage.vue"));

    // Create the loader function closure, potentially passing reactive args
    const loader = () => useMyPageLoader(someId);
    </script>
    ```

3.  **Page Component (`MyPage.vue`)**: Calls the _same_ loader function to get access to the query results (leveraging the cache). It renders the UI assuming data is loaded, as `AsyncPage` handles the loading/error states.

    ```vue
    <!-- src/pages/MyPage/MyPage.vue -->
    <template>
      <v-container v-if="myData">
        <h1>My Page - {{ myData.name }}</h1>
        <!-- Render using myData and moreData -->
      </v-container>
      <!-- No v-if/v-else for loading/error needed here -->
    </template>

    <script setup lang="ts">
    import { computed } from "vue";
    import { useRoute } from "vue-router";
    import { useMyPageLoader } from "./MyPage.loader.ts";

    const route = useRoute();
    const someId = computed(() => {
      /* extract ID from route.params */
    });

    // Call the loader again to get data (relies on cache)
    const [myQuery, moreQuery] = useMyPageLoader(someId);

    const myData = computed(
      () =>
        myQuery.data.value /* Adjust access based on actual data structure */,
    );
    const moreData = computed(() => moreQuery.data.value /* Adjust access */);

    // Component logic using myData, moreData...
    </script>
    ```

4.  **Usage in Router**: Use the `Async` component in your router configuration.

    ```typescript
    // src/router.ts
    import MyPageAsync from "./pages/MyPage/MyPageAsync.vue";

    const routes = [
      {
        path: "/my-page/:id",
        name: "MyPage",
        component: MyPageAsync,
      },
      // ... other routes
    ];
    ```

**Shared `AsyncPage` Component:**

The `AsyncPage` component (located in `@saflib/vue`) handles the core logic:

- Takes `loader` (function returning `UseQueryReturnType[]`) and `pageComponent` (async component definition) as props.
- Executes the `loader` function.
- Uses computed properties to check `isLoading` and `isError` across all returned queries.
- Renders `<v-progress-circular>` if any query is loading.
- Renders `<v-alert>` with specific error messages (based on `TanstackError` status codes like 401, 403, 404, 500) if any query has an error (and none are loading).
- Renders the passed `pageComponent` using `<component :is="...">` only when no queries are loading and no errors are present.

This pattern promotes cleaner page components focused solely on displaying data and handling user interactions, while centralizing the loading/error UI logic in `AsyncPage`.

## Testing

### Component Testing

- Write unit tests for complex logic
- Test component props and events
- Use Vue Test Utils for component testing
