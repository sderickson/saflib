import { describe, it, expect, vi } from "vitest";
import {
  useResizeObserverMock,
  mountWithPlugins,
  waitFor,
} from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import LoginPage from "./LoginPage.vue";
import { router } from "../router";

interface LoginRequest {
  email: string;
  password: string;
}

// Set up MSW server
export const handlers = [
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

export const server = setupMockServer(handlers);

describe("LoginPage", () => {
  useResizeObserverMock();

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    const emailInput = wrapper.findComponent({
      name: "v-text-field",
      props: { placeholder: "Email address" },
    });
    expect(emailInput.exists()).toBe(true);
    return emailInput;
  };

  const getPasswordInput = (wrapper: VueWrapper) => {
    const passwordInput = wrapper.findComponent({
      name: "v-text-field",
      props: { placeholder: "Enter your password" },
    });
    expect(passwordInput.exists()).toBe(true);
    return passwordInput;
  };

  const getLoginButton = (wrapper: VueWrapper) => {
    const button = wrapper.findComponent({
      name: "v-btn",
      text: "Log In",
    });
    expect(button.exists()).toBe(true);
    return button;
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
    await wrapper.vm.$nextTick();
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
    expect(loginButton.attributes("disabled")).toBeDefined();

    // Invalid email
    await fillLoginForm(wrapper, {
      email: "invalid-email",
      password: "password123",
    });
    expect(loginButton.attributes("disabled")).toBeDefined();

    // Valid email but short password
    await fillLoginForm(wrapper, {
      email: "test@example.com",
      password: "short",
    });
    expect(loginButton.attributes("disabled")).toBeDefined();

    // Valid form
    await fillLoginForm(wrapper, {
      email: "test@example.com",
      password: "validpassword123",
    });
    expect(loginButton.attributes("disabled")).toBeUndefined();
  });

  it("should call login function with credentials when form is submitted", async () => {
    const wrapper = mountComponent();
    const loginButton = getLoginButton(wrapper);

    await fillLoginForm(wrapper, {
      email: "test@example.com",
      password: "validpassword123",
    });

    await loginButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for the success state
    const successAlert = await waitFor(() =>
      wrapper.findComponent({ name: "v-alert", props: { type: "success" } }),
    );
    expect(successAlert?.exists()).toBe(true);
  });
});
