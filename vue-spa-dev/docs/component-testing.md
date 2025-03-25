# Vue Component Testing Guide

This guide outlines best practices for writing unit tests for Vue components in your project.

## Setup

### Test Environment

We use the following tools for testing:

- Vitest as the test runner
- Vue Test Utils for component testing
- JSDOM for browser environment simulation
- Vuetify for UI components

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  withResizeObserverMock,
  mountWithPlugins,
} from "@saflib/vue-spa/test-utils/components";
import YourComponent from "../YourComponent.vue";

withResizeObserverMock(() => {
  describe("YourComponent", () => {
    // Helper functions for element selection
    const getEmailInput = (wrapper) => {
      const emailInput = wrapper.find("[placeholder='Email address']");
      expect(emailInput.exists()).toBe(true);
      return emailInput;
    };

    const getSubmitButton = (wrapper) => {
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe("Submit");
      return button;
    };

    const mountComponent = (props = {}) => {
      return mountWithPlugins(YourComponent, {
        props,
        // Additional options as needed
      });
    };

    beforeEach(() => {
      // Clear mocks and reset state
      vi.clearAllMocks();
    });

    // Tests go here
    it("should render the form", () => {
      const wrapper = mountComponent();
      expect(getEmailInput(wrapper).exists()).toBe(true);
      expect(getSubmitButton(wrapper).exists()).toBe(true);
    });
  });
});
```

### Using Test Utilities

We provide several test utilities to simplify component testing, especially with Vuetify components:

#### ResizeObserver Mock

Vuetify components often use the ResizeObserver API, which is not available in the JSDOM environment. We provide a helper function to mock this API:

```typescript
import { describe, it, expect } from "vitest";
import { withResizeObserverMock } from "@saflib/vue-spa/test-utils/components";

withResizeObserverMock(() => {
  describe("YourComponent", () => {
    // Your tests here
  });
});
```

The `withResizeObserverMock` helper:

1. Sets up a mock ResizeObserver implementation before your tests run
2. Executes your test suite
3. Cleans up the mock after your tests complete

Always wrap your Vuetify component tests with this helper to avoid ResizeObserver errors.

#### Mounting Components with Plugins

The `mountWithPlugins` function (previously known as `mountWithVuetify`) simplifies mounting components that use Vuetify and other plugins like Vue Router:

```typescript
import { mountWithPlugins } from "@saflib/vue-spa/test-utils/components";
import { router } from "@your-app/router"; // Import your app's router

const wrapper = mountWithPlugins(
  YourComponent,
  {
    props: {
      // Component props
    },
    global: {
      // Additional global options
      stubs: ["router-link"],
    },
  },
  {
    router, // Pass your app's router instance
  }
);
```

This function:

1. Creates a Vuetify instance with all components and directives
2. Sets up the router you provide (or creates a default one if none is provided)
3. Mounts the component with the Vuetify plugin and router
4. Merges any additional options you provide

## Best Practices

### 1. Start with a Render Test

Always begin with a render test that validates your element selection helpers work:

```typescript
it("should render the form", () => {
  const wrapper = mountComponent();
  expect(getEmailInput(wrapper).exists()).toBe(true);
  expect(getPasswordInput(wrapper).exists()).toBe(true);
  expect(getSubmitButton(wrapper).exists()).toBe(true);
});
```

This test serves two purposes:

1. Verifies the component renders correctly
2. Tests your element selection helpers early

### 2. Element Selection Strategy

1. Prefer `wrapper.find()` with specific attributes:

   ```typescript
   // Good - uses placeholder text that's already in the component
   const getEmailInput = (wrapper) =>
     wrapper.find("[placeholder='Email address']");

   // Good - uses button text that's already in the component
   const getSubmitButton = (wrapper) => {
     const button = wrapper.find("button");
     expect(button.text()).toBe("Submit");
     return button;
   };

   // Avoid - using test-specific data attributes
   wrapper.find("[data-test='email-input']");
   ```

2. Selection priority (in order of preference):

   - Placeholder text for inputs
   - Button/element text content
   - Component-specific classes (e.g., Vuetify classes)
   - Element type + context
   - Custom data attributes (last resort)

3. Make selection helpers robust:
   ```typescript
   const getInput = (wrapper, placeholder) => {
     const input = wrapper.find(`[placeholder='${placeholder}']`);
     expect(input.exists()).toBe(true);
     return input;
   };
   ```

### 3. Form Interaction Helpers

Create reusable helpers for common form interactions:

```typescript
const fillForm = async (wrapper, { email, password }) => {
  await getEmailInput(wrapper).setValue(email);
  await getPasswordInput(wrapper).setValue(password);
  await wrapper.vm.$nextTick();
};
```

### 4. Async Testing

1. Always use `async/await` when:

   - Setting input values
   - Triggering events
   - Checking validation messages
   - After any state changes

2. Use a single `$nextTick` after state changes:

   ```typescript
   await input.setValue("value");
   await wrapper.vm.$nextTick();
   expect(wrapper.text()).toContain("Validation message");
   ```

3. Common misconceptions:
   - Multiple `$nextTick` calls are not needed - a single call is sufficient
   - Adding more `$nextTick` calls won't fix timing issues
   - If a test is flaky, look for other causes like missing awaits on events or setValue calls

### 5. Validation Testing

Test validation messages using text content:

```typescript
it("should validate email format", async () => {
  const wrapper = mountComponent();
  const emailInput = getEmailInput(wrapper);

  await emailInput.setValue("invalid-email");
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).toContain("Must be a valid email");

  await emailInput.setValue("valid@email.com");
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).not.toContain("Must be a valid email");
});
```

### 6. Button State Testing

Test button states using attributes:

```typescript
it("should disable submit button when form is invalid", async () => {
  const wrapper = mountComponent();
  const submitButton = getSubmitButton(wrapper);

  // Initially disabled
  expect(submitButton.attributes("disabled")).toBeDefined();

  // After valid input
  await fillForm(wrapper, {
    email: "valid@email.com",
    password: "validpassword123",
  });
  expect(submitButton.attributes("disabled")).toBeUndefined();
});
```

### 7. Mocking External Dependencies

#### Proper Mocking with importOriginal

Always use the `importOriginal` pattern when mocking modules to preserve the original module's structure:

```typescript
// RECOMMENDED: Use importOriginal to preserve module structure
const mockSubmit = vi.fn();
vi.mock("../path/to/module", async (importOriginal) => {
  const original = await importOriginal<typeof import("../path/to/module")>();
  return {
    ...original, // Preserve all original exports
    useSubmit: () => ({
      mutate: mockSubmit,
      isPending: { value: false },
      isError: { value: false },
    }),
  };
});

// AVOID: This approach completely replaces the module and loses original exports
vi.mock("../path/to/module", () => ({
  useSubmit: () => ({
    mutate: vi.fn(),
    isPending: { value: false },
    isError: { value: false },
  }),
}));
```

The `importOriginal` pattern:

1. Preserves all original exports from the module
2. Only overrides the specific functions you need to mock
3. Prevents unexpected errors when the component uses other exports from the same module
4. Provides better TypeScript support

Example of mocking Vue Router:

```typescript
const mockPush = vi.fn();
vi.mock("vue-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("vue-router")>();
  return {
    ...original,
    useRouter: vi.fn(() => ({
      push: mockPush,
    })),
  };
});
```

Reset mocks in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  mockPush.mockReset();
});
```

### 8. Testing Vuetify Components

1. Finding Vuetify Components:

   ```typescript
   // Use findComponent with the name option
   const dialog = wrapper.findComponent({ name: "v-dialog" });
   expect(dialog.exists()).toBe(true);

   // For buttons with icons, find by icon class
   const deleteButton = wrapper
     .findAll(".v-btn")
     .find((btn) => btn.find(".mdi-delete").exists());
   ```

2. Testing Dialogs:

It's unclear how to do this. It may also not be that valuable. Perhaps it would be better to separate out
dialog components and then test the component that opens a modal with a mock modal. If testing modal interactions
can't be done well, then just skip the tests.

### 9. Black-Box Testing Approach

1. Prefer black-box testing over accessing component internals:

   ```typescript
   // Avoid - accessing component's internal state
   // @ts-expect-error - Accessing component's internal state
   expect(wrapper.vm.showDeleteDialog).toBe(true);

   // Better - verify the dialog is visible in the DOM
   const dialog = wrapper.findComponent({ name: "v-dialog" });
   expect(dialog.exists()).toBe(true);
   ```

2. Avoid calling component methods directly:

   ```typescript
   // Avoid - calling component's internal method
   // @ts-expect-error - Accessing component's internal method
   await wrapper.vm.deleteCallSeries();

   // Better - simulate user interaction
   await deleteButton.trigger("click");
   await wrapper.vm.$nextTick();
   const confirmButton = wrapper.findAll(".v-card-actions .v-btn").at(-1);
   await confirmButton.trigger("click");
   ```

3. Focus on testing behavior, not implementation:
   - Test what the user sees and can interact with
   - Verify that the correct events are emitted
   - Check that the right API calls are made
   - Ensure error messages are displayed correctly

### 10. Common Gotchas

1. Vuetify Validation:

   - May need multiple `$nextTick` calls
   - Use `wrapper.text()` to check validation messages
   - Button states may depend on form validation

2. Component Mounting:

   - Always use `mountWithPlugins` for Vuetify components
   - Provide your app's router when testing components that use routing
   - Consider global plugins and providers

3. Async Operations:

   - Always use `async/await`
   - Wait for component updates with `$nextTick`
   - Test both success and error states

4. Reactive Properties in Mocks:

   - Reactive properties from composables should be objects with a `value` property
   - Example: `isPending: { value: false }` instead of `isPending: false`

5. Finding Elements in Dialogs:

   - Dialogs may be rendered in portals outside the component's DOM tree
   - Use `wrapper.findAll()` instead of `dialog.findAll()`
   - Identify elements by text content rather than by class names

6. ResizeObserver Issues:
   - Always wrap Vuetify component tests with `withResizeObserverMock`
   - Place the wrapper at the top level of your test file
   - This ensures ResizeObserver is properly mocked for all tests

## Example Test

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  withResizeObserverMock,
  mountWithPlugins,
} from "@saflib/vue-spa/test-utils/components";
import LoginForm from "../LoginForm.vue";
import { router } from "@your-app/router"; // Import your app's router

// Mock the auth request with importOriginal pattern
const mockSubmit = vi.fn();
vi.mock("../../requests/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../requests/auth")>();
  return {
    ...original, // Preserve all original exports
    useLogin: () => ({
      mutate: mockSubmit,
      isPending: { value: false },
      isError: { value: false },
    }),
  };
});

withResizeObserverMock(() => {
  describe("LoginForm", () => {
    const mountLoginForm = (props = {}) => {
      return mountWithPlugins(
        LoginForm,
        { props },
        { router } // Pass your app's router
      );
    };

    const getEmailInput = (wrapper) =>
      wrapper.find("[placeholder='Email address']");

    const getPasswordInput = (wrapper) =>
      wrapper.find("[placeholder='Password']");

    const getLoginButton = (wrapper) => wrapper.find("button");

    const fillLoginForm = async (wrapper, email, password) => {
      await getEmailInput(wrapper).setValue(email);
      await getPasswordInput(wrapper).setValue(password);
      await wrapper.vm.$nextTick();
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle form submission", async () => {
      const wrapper = mountLoginForm();

      await fillLoginForm(wrapper, "test@example.com", "validpassword123");

      const submitButton = getLoginButton(wrapper);
      await submitButton.trigger("click");
      await wrapper.vm.$nextTick();

      expect(mockSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "validpassword123",
      });
    });
  });
});
```
