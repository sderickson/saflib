import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import LoginPage from "./LoginPage.vue";
import { router } from "../auth-router.ts";

interface LoginRequest {
  email: string;
  password: string;
}

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
        },
      },
    });
  }),
];

describe("LoginPage", () => {
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
    return mountWithPlugins(LoginPage, {}, { router });
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
          },
        });
      }),
    );

    // Manually set form validation state since we can't trigger it in tests
    // await wrapper.setData({ valid: true });
    await wrapper.vm.$nextTick();

    await loginButton.trigger("click");

    // Wait for the API request to complete
    await vi.waitFor(() => expect(location.href).toBe("/app/"));
  });
});
