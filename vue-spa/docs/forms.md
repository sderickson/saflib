# Form Design Patterns in Vue

This guide outlines best practices for implementing forms in Vue applications. It covers component structure, state management, and the separation of concerns between form components and their parents.

## Table of Contents

- [Core Principles](#core-principles)
- [Form Component Design](#form-component-design)
  - [Using Individual Refs for Form Fields](#using-individual-refs-for-form-fields)
  - [Minimal Interface Design](#minimal-interface-design)
  - [Separation from Networking Concerns](#separation-from-networking-concerns)
- [Parent Component Responsibilities](#parent-component-responsibilities)
  - [Data Loading with TanStack Query](#data-loading-with-tanstack-query)
  - [Conditional Rendering](#conditional-rendering)
  - [Handling Form Submissions](#handling-form-submissions)
  - [Navigation Control](#navigation-control)
- [Using v-list for Form Selection](#using-v-list-for-form-selection)
- [Complete Example](#complete-example)
  - [Form Component](#form-component)
  - [Parent Component](#parent-component)
- [Common Pitfalls](#common-pitfalls)
- [When to Use This Pattern](#when-to-use-this-pattern)

## Core Principles

Effective form implementation in Vue applications follows these core principles:

1. **Separation of concerns**: Form components should focus on UI and user input, while parent components handle data fetching, validation, and submission.
2. **Minimal interfaces**: Form components should have a clean, minimal API that makes them easy to reuse.
3. **Reactive state management**: Use Vue's reactivity system effectively to manage form state.
4. **Clear data flow**: Maintain a clear flow of data between parent and form components.

## Form Component Design

### Using Individual Refs for Form Fields

Form components should use separate `ref`s for each form field rather than a single object containing all fields. This approach offers several advantages:

```vue
<script setup lang="ts">
// ✅ Good: Individual refs for each field
const firstName = ref("");
const lastName = ref("");
const email = ref("");

// ❌ Avoid: Single object containing all fields
const formData = ref({
  firstName: "",
  lastName: "",
  email: "",
});
</script>
```

Benefits of individual refs:

- More granular reactivity
- Easier to add field-specific validation or transformation logic
- Clearer code organization, especially for complex forms
- Better alignment with Vue's reactivity system

For computed properties that combine multiple fields, you can create a computed property:

```vue
<script setup lang="ts">
const firstName = ref("");
const lastName = ref("");

const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`.trim();
});
</script>
```

### Minimal Interface Design

Form components should have a minimal, clear interface:

```vue
<script setup lang="ts">
// Define props with required initialData
const props = defineProps<{
  initialData: UserProfile; // Make this required
}>();

// Define simple emit events
const emit = defineEmits<{
  (e: "update", data: UserProfile): void;
}>();
</script>
```

Key aspects of a minimal interface:

- Required `initialData` prop to populate the form
- Simple `update` event that emits changes to the parent
- No loading/saving states in the form component itself
- No save buttons or submission logic (handled by parent)

### Separation from Networking Concerns

Form components should be completely decoupled from API calls and networking:

```vue
<script setup lang="ts">
// ✅ Good: Form component only manages local state and emits updates
const name = ref(props.initialData.name);
const email = ref(props.initialData.email);

// Watch for changes and emit updates
watch(
  [name, email],
  () => {
    emit("update", {
      name: name.value,
      email: email.value,
    });
  },
  { deep: true },
);

// ❌ Avoid: Form component making API calls
const saveForm = async () => {
  await api.updateUser(formData.value); // Don't do this in form components
};
</script>
```

Benefits of this separation:

- Form components become more reusable
- Testing is simplified without API dependencies
- Parent components can implement different saving strategies
- Clear separation of UI concerns from application logic

## Parent Component Responsibilities

### Data Loading with TanStack Query

Parent components should handle data loading using TanStack Query:

```vue
<script setup lang="ts">
import { useGetUserProfile, useUpdateUserProfile } from "@/api/userProfile";
import UserProfileForm from "@/components/UserProfileForm.vue";

// Load data with TanStack Query
const { data: profile, isLoading, error } = useGetUserProfile(userId);

// Setup mutation for updates
const { mutate: updateProfile, isPending: isSaving } = useUpdateUserProfile();

// Handle form updates
const handleFormUpdate = (updatedData) => {
  // Store updated data or trigger immediate save
};
</script>
```

### Conditional Rendering

Only render form components when data is available:

```vue
<template>
  <div v-if="isLoading">
    <v-progress-circular indeterminate></v-progress-circular>
  </div>
  <div v-else-if="error">Error loading data: {{ error.message }}</div>
  <UserProfileForm v-else :initial-data="profile" @update="handleFormUpdate" />
</template>
```

This approach:

- Prevents errors from trying to render forms with undefined data
- Provides clear feedback to users about loading states
- Simplifies form component logic by guaranteeing data availability

### Handling Form Submissions

Parent components should manage form submission logic:

```vue
<script setup lang="ts">
const handleSave = async () => {
  if (!formData.value) return;

  try {
    await updateProfile(formData.value);
    // Handle successful save (notifications, navigation, etc.)
  } catch (error) {
    // Handle errors
  }
};
</script>

<template>
  <div>
    <UserProfileForm :initial-data="profile" @update="formData = $event" />

    <div class="actions">
      <v-btn
        color="primary"
        :loading="isSaving"
        :disabled="!isFormValid"
        @click="handleSave"
      >
        Save Changes
      </v-btn>
    </div>
  </div>
</template>
```

### Navigation Control

Parent components should handle navigation control, including:

- Preventing accidental navigation away from unsaved changes
- Redirecting after successful submissions
- Handling cancellation flows

```vue
<script setup lang="ts">
const router = useRouter();
const hasUnsavedChanges = ref(false);

// Update flag when form changes
const handleFormUpdate = (data) => {
  formData.value = data;
  hasUnsavedChanges.value = true;
};

// Handle navigation
const handleSave = async () => {
  await updateProfile(formData.value);
  hasUnsavedChanges.value = false;
  router.push("/success-page");
};

// Optional: Prevent accidental navigation
onBeforeRouteLeave((to, from, next) => {
  if (hasUnsavedChanges.value) {
    // Show confirmation dialog
    if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
      next();
    } else {
      next(false);
    }
  } else {
    next();
  }
});
</script>
```

## Using v-list for Form Selection

When implementing selection interfaces with Vuetify's `v-list` component, follow these best practices:

### Leveraging v-model:selected for Selection Management

Vuetify's `v-list` component provides built-in selection management through the `v-model:selected` directive. This is the preferred approach for handling selections:

```vue
<template>
  <!-- Single selection -->
  <v-list
    v-model:selected="selectedItem"
    class="border rounded"
    select-strategy="single-independent"
  >
    <v-list-item v-for="item in items" :key="item.id" :value="item.id">
      <v-list-item-title>{{ item.name }}</v-list-item-title>
    </v-list-item>
  </v-list>

  <!-- Multiple selection -->
  <v-list
    v-model:selected="selectedItems"
    class="border rounded"
    select-strategy="independent"
  >
    <v-list-item
      v-for="item in items"
      :key="item.id"
      :value="item.id"
      :disabled="isItemDisabled(item)"
    >
      <template #prepend="{ isSelected }">
        <v-checkbox-btn
          :model-value="isSelected"
          :aria-label="item.name"
        ></v-checkbox-btn>
      </template>
      <v-list-item-title>{{ item.name }}</v-list-item-title>
    </v-list-item>
  </v-list>
</template>
```

### Key Benefits of This Approach

1. **Simplified state management**: The `v-model:selected` directive handles all selection state internally.
2. **Automatic toggling**: Clicking on list items automatically toggles their selection state.
3. **Accessibility**: Using `v-list-item-action` with `v-checkbox-btn` provides proper accessibility.
4. **Cleaner code**: No need for custom click handlers or manual state management.

### Handling Single vs. Multiple Selection

- For single selection, use `select-strategy="single-independent"` and bind to a string or number ref.
- For multiple selection, use `select-strategy="independent"` and bind to an array ref.

If your data model uses a single string for a single selection but the v-list requires an array, you can use a computed property with getter/setter:

```vue
<script setup>
const selectedCategory = ref("");

const selectedCategories = computed({
  get: () => {
    return selectedCategory.value ? [selectedCategory.value] : [];
  },
  set: (value) => {
    selectedCategory.value = value[0];
  },
});
</script>

<template>
  <v-list
    v-model:selected="selectedCategories"
    select-strategy="single-independent"
  >
    <!-- List items -->
  </v-list>
</template>
```

### Displaying Selection State

Use the `isSelected` parameter provided by the `#prepend` slot to display the selection state:

```vue
<template #prepend="{ isSelected }">
  <v-list-item-action start>
    <v-checkbox-btn
      :model-value="isSelected"
      :aria-label="item.name"
    ></v-checkbox-btn>
  </v-list-item-action>
</template>
```

### Handling Disabled Items

Use the `:disabled` prop on `v-list-item` to prevent selection of certain items:

```vue
<v-list-item
  :disabled="
    selectedItems.length >= maxSelections && !selectedItems.includes(item.id)
  "
>
  <!-- Item content -->
</v-list-item>
```

### Best Practices

1. **Always use `v-model:selected`** instead of manual click handlers.
2. **Provide `aria-label` attributes** on checkboxes for accessibility.
3. **Use `v-list-item-action` with `start` prop** for proper checkbox positioning.
4. **Set appropriate `select-strategy`** based on your selection requirements.
5. **Handle disabled states** at the list item level, not just the checkbox.

## Complete Example

### Form Component

```vue
<script setup lang="ts">
import { ref, watch } from "vue";

// Define the interface for the form data
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

// Props and emits
const props = defineProps<{
  initialData: PersonalInfo;
}>();

const emit = defineEmits<{
  (e: "update", data: PersonalInfo): void;
}>();

// Individual refs for each field
const firstName = ref(props.initialData.firstName);
const lastName = ref(props.initialData.lastName);
const email = ref(props.initialData.email);
const phone = ref(props.initialData.phone);
const address = ref(props.initialData.address);

// Watch for changes and emit updates
watch(
  [firstName, lastName, email, phone, address],
  () => {
    emit("update", {
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      phone: phone.value,
      address: address.value,
    });
  },
  { deep: true },
);
</script>

<template>
  <div class="personal-info-form">
    <v-text-field
      v-model="firstName"
      label="First Name"
      required
    ></v-text-field>

    <v-text-field v-model="lastName" label="Last Name" required></v-text-field>

    <v-text-field
      v-model="email"
      label="Email"
      type="email"
      required
    ></v-text-field>

    <v-text-field v-model="phone" label="Phone"></v-text-field>

    <v-textarea v-model="address" label="Address" rows="3"></v-textarea>
  </div>
</template>
```

### Parent Component

```vue
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useGetUserProfile, useUpdateUserProfile } from "@/api/userProfile";
import PersonalInfoForm from "@/components/PersonalInfoForm.vue";
import type { PersonalInfo } from "@/components/PersonalInfoForm.vue";

const router = useRouter();

// Load user profile data
const { data: profile, isLoading, error } = useGetUserProfile();

// Setup mutation for updates
const { mutate: updateProfile, isPending: isSaving } = useUpdateUserProfile();

// Local state for form data
const formData = ref<PersonalInfo | null>(null);

// Form validation
const isFormValid = computed(() => {
  if (!formData.value) return false;

  return Boolean(
    formData.value.firstName && formData.value.lastName && formData.value.email,
  );
});

// Handle form updates
const handleFormUpdate = (data: PersonalInfo) => {
  formData.value = data;
};

// Handle save action
const handleSave = async () => {
  if (!formData.value || !isFormValid.value) return;

  try {
    await updateProfile(formData.value);
    router.push("/profile/success");
  } catch (error) {
    console.error("Failed to save profile:", error);
    // Show error notification
  }
};

// Handle cancel action
const handleCancel = () => {
  router.push("/profile");
};
</script>

<template>
  <v-container>
    <h1>Edit Profile</h1>

    <!-- Loading state -->
    <div v-if="isLoading" class="d-flex justify-center my-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>

    <!-- Error state -->
    <v-alert v-else-if="error" type="error" class="my-4">
      Failed to load profile: {{ error.message }}
    </v-alert>

    <!-- Form -->
    <div v-else>
      <PersonalInfoForm
        :initial-data="profile.personalInfo"
        @update="handleFormUpdate"
      />

      <div class="d-flex mt-6">
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          :disabled="!isFormValid || isSaving"
          :loading="isSaving"
          @click="handleSave"
        >
          Save Changes
        </v-btn>
      </div>
    </div>
  </v-container>
</template>
```

## Common Pitfalls

1. **Mixing concerns**: Avoid having form components make API calls or handle routing.
2. **Deep nesting**: For complex forms, consider breaking them into smaller, focused components.
3. **Premature optimization**: Don't over-engineer simple forms; this pattern is most valuable for complex or reused forms.
4. **Missing validation**: Form validation should be handled consistently, either in the form component or parent.
5. **Ignoring loading states**: Always handle loading states to prevent errors and improve user experience.

## When to Use This Pattern

This form design pattern is particularly valuable for:

- Forms that are reused across multiple views
- Complex forms with many fields
- Forms that edit data loaded from an API
- Multi-step forms or wizards
- Forms where the same data might be edited in different contexts

For very simple, one-off forms, a more integrated approach might be simpler and require less boilerplate.
