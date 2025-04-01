# Test Vue

This guide outlines best practices for writing unit tests for Vue components in your project.

## Setup

### Test Environment

We use the following tools for testing:

- Vitest as the test runner
- Vue Test Utils for component testing
- JSDOM for browser environment simulation
- Vuetify for UI components

### Test File Location

Test files should be placed adjacent to the component files they test. For example:

```
src/
  components/
    MyComponent.vue
    MyComponent.test.ts
```

This makes it easy to find tests and keeps them close to the code they're testing.

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import YourComponent from "./YourComponent.vue";
import { router } from "../router"; // Import your app's router

// Set up MSW server if component makes network requests
const handlers = [
  http.post("/api/endpoint", async () => {
    return HttpResponse.json({
      success: true,
      data: {
        /* response data */
      },
    });
  }),
];

describe("YourComponent", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const emailInput = inputs.find(
      (input) => input.props("placeholder") === "Email address",
    );
    expect(emailInput?.exists()).toBe(true);
    return emailInput!;
  };

  const getSubmitButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    const submitButton = buttons.find((button) => button.text() === "Submit");
    expect(submitButton?.exists()).toBe(true);
    return submitButton!;
  };

  const mountComponent = () => {
    return mountWithPlugins(YourComponent, {}, { router });
  };

  // Tests go here
  it("should render the form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getSubmitButton(wrapper).exists()).toBe(true);
  });
});
```

### Using Test Utilities

We provide several test utilities to simplify component testing, especially with Vuetify components:

#### Global Mocks

Always use `stubGlobals()` at the start of your test suite to set up necessary global mocks:

```typescript
import { stubGlobals } from "@saflib/vue-spa-dev/components";

describe("YourComponent", () => {
  stubGlobals();
  // Your tests here
});
```

This helper:

1. Sets up a mock ResizeObserver implementation
2. Mocks the global `location` object
3. Cleans up all global mocks after tests complete

#### Network Mocking with MSW

We use MSW (Mock Service Worker) to mock network requests at the HTTP level. This approach is more reliable than mocking query hooks or API clients directly.

1. Set up the mock server in your test file:

```typescript
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";

const handlers = [
  http.post("/api/endpoint", async () => {
    return HttpResponse.json({
      success: true,
      data: {
        /* response data */
      },
    });
  }),
];

const server = setupMockServer(handlers);
```

2. Override handlers for specific test cases:

```typescript
it("should handle error response", async () => {
  server.use(
    http.post("http://api.localhost:3000/endpoint", () => {
      return new HttpResponse(JSON.stringify({ error: "API Error" }), {
        status: 500,
      });
    }),
  );

  // Test error handling...
});
```

3. Use `vi.waitFor` or `vi.waitUntil` for async operations:

```typescript
it("should show success message after API call", async () => {
  const wrapper = mountComponent();
  await submitButton.trigger("click");

  // Wait for the success alert to appear
  const successAlert = await vi.waitUntil(() => getSuccessAlert(wrapper));
  expect(successAlert?.text()).toContain("Success message");
});
```

#### Mounting Components with Plugins

The `mountWithPlugins` function simplifies mounting components that use Vuetify and other plugins like Vue Router:

```typescript
import { mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { router } from "../router";

const mountComponent = () => {
  return mountWithPlugins(YourComponent, {}, { router });
};
```

This function:

1. Creates a Vuetify instance with all components and directives
2. Sets up the router you provide (or creates a default one if none is provided)
3. Mounts the component with the Vuetify plugin and router
4. Merges any additional options you provide

Always provide your app's router when testing components that use routing:

```typescript
// Good - provide the actual router
return mountWithPlugins(YourComponent, {}, { router });

// Avoid - using router stubs
return mountWithPlugins(YourComponent, {
  global: {
    stubs: ["router-link"],
  },
});
```

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

1. Prefer `findComponent` and `findAllComponents` over `find`:

   ```typescript
   // Good - using findComponent for single components
   const getSubmitButton = (wrapper: VueWrapper) => {
     const buttons = wrapper.findAllComponents({ name: "v-btn" });
     const submitButton = buttons.find((button) => button.text() === "Submit");
     expect(submitButton?.exists()).toBe(true);
     return submitButton!;
   };

   // Good - using findAllComponents for multiple components
   const getErrorAlert = (wrapper: VueWrapper) => {
     const alerts = wrapper.findAllComponents({ name: "v-alert" });
     const errorAlert = alerts.find((alert) => alert.props("type") === "error");
     expect(errorAlert?.exists()).toBe(true);
     return errorAlert;
   };

   // Avoid - using find with selectors, especially internal Vuetify classes
   wrapper.find(".v-alert--error");
   ```

2. Selection priority (in order of preference):

   - Component name + props (e.g., `findComponent({ name: "v-btn", props: { color: "error" } })`)
   - Component name + text content
   - Component name + context
   - Placeholder text for inputs
   - Button/element text content
   - Component-specific classes
   - Custom data attributes (last resort)

3. Make selection helpers robust:
   ```typescript
   const getInput = (wrapper: VueWrapper, placeholder: string) => {
     const inputs = wrapper.findAllComponents({ name: "v-text-field" });
     const input = inputs.find(
       (input) => input.props("placeholder") === placeholder,
     );
     expect(input?.exists()).toBe(true);
     return input!;
   };
   ```

### 3. Async Testing

1. Always use `async/await` when:

   - Setting input values
   - Triggering events
   - Checking validation messages
   - After any state changes

2. Use `wrapper.vm.$nextTick()` after state changes:

   ```typescript
   await input.setValue("value");
   await wrapper.vm.$nextTick();
   expect(wrapper.text()).toContain("Validation message");
   ```

3. Use `vi.waitFor` or `vi.waitUntil` for async operations:

   ```typescript
   // For checking conditions
   await vi.waitFor(() => expect(location.href).toBe("/app/"));

   // For finding elements
   const successAlert = await vi.waitUntil(() => getSuccessAlert(wrapper));
   expect(successAlert?.text()).toContain("Success message");
   ```

4. Common misconceptions:
   - Multiple `$nextTick` calls are not needed - a single call is sufficient
   - Adding more `$nextTick` calls won't fix timing issues
   - If a test is flaky, look for other causes like missing awaits on events or setValue calls

### 4. Form Interaction Helpers

Create reusable helpers for common form interactions:

```typescript
const fillForm = async (
  wrapper: VueWrapper,
  { email, password }: { email: string; password: string },
) => {
  await getEmailInput(wrapper).setValue(email);
  await getPasswordInput(wrapper).setValue(password);
  await wrapper.vm.$nextTick();
  // Wait for validation to complete
  await new Promise((resolve) => setTimeout(resolve, 0));
};
```

### 5. Validation Testing

Test validation messages using text content:

```typescript
it("should validate email format", async () => {
  const wrapper = mountComponent();
  const emailInput = getEmailInput(wrapper);

  // Test invalid email
  await emailInput.setValue("invalid-email");
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).toContain("Email must be valid");

  // Test valid email
  await emailInput.setValue("valid@email.com");
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).not.toContain("Email must be valid");
});
```

### 6. Button State Testing

Test button states using attributes:

```typescript
it("should disable submit button when form is invalid", async () => {
  const wrapper = mountComponent();
  const submitButton = getSubmitButton(wrapper);

  // Initially disabled
  expect(submitButton.attributes("disabled")).toBe("");

  // After valid input
  await fillForm(wrapper, {
    email: "valid@email.com",
    password: "validpassword123",
  });
  expect(submitButton.attributes("disabled")).toBeUndefined();
});
```

### 7. Network Request Testing

1. Set up default handlers for successful responses using types from your OpenAPI spec:

   ```typescript
   import type { LoginRequest, UserResponse } from "./types";

   export const handlers = [
     http.post("http://api.localhost:3000/auth/login", async ({ request }) => {
       const body = (await request.json()) as LoginRequest;
       return HttpResponse.json({
         success: true,
         data: {
           token: "mock-token",
           user: {
             id: 1,
             email: body.email,
           } satisfies UserResponse,
         },
       });
     }),
   ];
   ```

2. Override handlers for specific test cases:

   ```typescript
   it("should handle error response", async () => {
     server.use(
       http.post("http://api.localhost:3000/auth/login", () => {
         return new HttpResponse(JSON.stringify({ error: "API Error" }), {
           status: 500,
         });
       }),
     );

     // Test error handling...
   });
   ```

3. Use `vi.waitFor` or `vi.waitUntil` to wait for async operations:

   ```typescript
   await submitButton.trigger("click");
   const successAlert = await vi.waitUntil(() => getSuccessAlert(wrapper));
   expect(successAlert?.text()).toContain("Success message");
   ```

4. Type Safety:
   - Always use types from your OpenAPI spec for request and response bodies
   - This ensures type safety and catches API changes early
   - Avoid creating local interfaces for API types
   - Use `satisfies` to ensure response objects match the expected type

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
   const confirmButton = wrapper.findAllComponents({ name: "v-btn" }).at(-1);
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
import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import LoginForm from "../LoginForm.vue";
import { router } from "../router";
import type { LoginRequest, UserResponse } from "../requests/types";

// Set up MSW server
const handlers = [
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    return HttpResponse.json({
      success: true,
      data: {
        token: "mock-token",
        user: {
          id: 1,
          email: body.email,
        } satisfies UserResponse,
      },
    });
  }),
];

describe("LoginForm", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const emailInput = inputs.find(
      (input) => input.props("placeholder") === "Email address",
    );
    expect(emailInput?.exists()).toBe(true);
    return emailInput!;
  };

  const getPasswordInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const passwordInput = inputs.find(
      (input) => input.props("placeholder") === "Enter your password",
    );
    expect(passwordInput?.exists()).toBe(true);
    return passwordInput!;
  };

  const getLoginButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    const loginButton = buttons.find((button) => button.text() === "Log In");
    expect(loginButton?.exists()).toBe(true);
    return loginButton!;
  };

  const mountComponent = () => {
    return mountWithPlugins(LoginForm, {}, { router });
  };

  const fillLoginForm = async (
    wrapper: VueWrapper,
    { email, password }: { email: string; password: string },
  ) => {
    await getEmailInput(wrapper).setValue(email);
    await getPasswordInput(wrapper).setValue(password);
    await vi.waitFor(() =>
      expect(wrapper.text()).not.toContain("Email must be valid"),
    );
  };

  it("should render the login form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getLoginButton(wrapper).exists()).toBe(true);
  });

  it("should disable login button when form is invalid", async () => {
    const wrapper = mountComponent();
    const loginButton = getLoginButton(wrapper);

    // Initially disabled
    expect(loginButton.attributes("disabled")).toBe("");

    // Invalid email
    await fillLoginForm(wrapper, {
      email: "invalid-email",
      password: "password123",
    });
    expect(loginButton.attributes("disabled")).toBe("");

    // Valid email but short password
    await fillLoginForm(wrapper, {
      email: "test@example.com",
      password: "short",
    });
    expect(loginButton.attributes("disabled")).toBe("");

    // Valid form
    await fillLoginForm(wrapper, {
      email: "test@example.com",
      password: "validpassword123",
    });
    expect(loginButton.attributes("disabled")).toBeUndefined();
  });

  it("should call login API with correct credentials", async () => {
    const wrapper = mountComponent();
    const loginButton = getLoginButton(wrapper);

    const testEmail = "test@example.com";
    const testPassword = "validpassword123";

    await fillLoginForm(wrapper, {
      email: testEmail,
      password: testPassword,
    });
    await wrapper.vm.$nextTick();

    // Create a spy for the API request
    let requestBody: LoginRequest | null = null;
    server.use(
      http.post("http://api.localhost:3000/auth/login", async ({ request }) => {
        requestBody = (await request.json()) as LoginRequest;
        return HttpResponse.json({
          success: true,
          data: {
            token: "mock-token",
            user: {
              id: 1,
              email: requestBody.email,
            },
          } satisfies UserResponse,
        });
      }),
    );

    await loginButton.trigger("click");

    // Wait for the API request to complete
    await vi.waitFor(() => expect(location.href).toBe("/app/"));
  });
});
```
