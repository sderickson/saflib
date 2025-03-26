# Writing Vue Components

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

## Testing

### Component Testing

- Write unit tests for complex logic
- Test component props and events
- Use Vue Test Utils for component testing
