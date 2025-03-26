import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import RegisterPage from "./RegisterPage.vue";

const mockRegister = vi.fn();
vi.mock("../requests/auth", () => ({
  useRegister: () => ({
    mutate: mockRegister,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
  }),
}));

const vuetify = createVuetify({
  components,
  directives,
});

describe("RegisterPage", () => {
  const mountComponent = () => {
    return mount(RegisterPage, {
      global: {
        plugins: [vuetify],
        stubs: ["router-link"],
      },
    });
  };

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    const emailInput = wrapper.find("[placeholder='Email address']");
    expect(emailInput.exists()).toBe(true);
    return emailInput;
  };

  const getPasswordInput = (wrapper: VueWrapper) => {
    const passwordInput = wrapper.find("[placeholder='Enter your password']");
    expect(passwordInput.exists()).toBe(true);
    return passwordInput;
  };

  const getConfirmPasswordInput = (wrapper: VueWrapper) => {
    const confirmPasswordInput = wrapper.find(
      "[placeholder='Confirm your password']",
    );
    expect(confirmPasswordInput.exists()).toBe(true);
    return confirmPasswordInput;
  };

  const getRegisterButton = (wrapper: VueWrapper) => {
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe("Register");
    return button;
  };

  const fillForm = async (
    wrapper: VueWrapper,
    {
      email,
      password,
      confirmPassword,
    }: { email: string; password: string; confirmPassword: string },
  ) => {
    await getEmailInput(wrapper).setValue(email);
    await getPasswordInput(wrapper).setValue(password);
    await getConfirmPasswordInput(wrapper).setValue(confirmPassword);
    await wrapper.vm.$nextTick();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockReset();
  });

  it("should render the registration form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getRegisterButton(wrapper).exists()).toBe(true);
  });

  it("should validate email format", async () => {
    const wrapper = mountComponent();
    const emailInput = getEmailInput(wrapper);

    await emailInput.setValue("invalid-email");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Email must be valid");

    await emailInput.setValue("valid@email.com");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain("Email must be valid");
  });

  it("should validate password requirements", async () => {
    const wrapper = mountComponent();
    const passwordInput = getPasswordInput(wrapper);

    await passwordInput.setValue("short");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Password must be at least");

    await passwordInput.setValue("validpassword123");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain("Password must be at least");
  });

  it("should validate password confirmation match", async () => {
    const wrapper = mountComponent();

    await fillForm(wrapper, {
      email: "test@example.com",
      password: "validpassword123",
      confirmPassword: "differentpassword",
    });

    expect(wrapper.text()).toContain("Passwords must match");

    await getConfirmPasswordInput(wrapper).setValue("validpassword123");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toContain("Passwords must match");
  });

  it("should disable register button when form is invalid", async () => {
    const wrapper = mountComponent();
    const registerButton = getRegisterButton(wrapper);

    // Initially disabled
    expect(registerButton.attributes("disabled")).toBeDefined();

    // After valid input
    await fillForm(wrapper, {
      email: "valid@email.com",
      password: "validpassword123",
      confirmPassword: "validpassword123",
    });
    expect(registerButton.attributes("disabled")).toBeUndefined();
  });

  it("should handle successful registration", async () => {
    const wrapper = mountComponent();

    await fillForm(wrapper, {
      email: "test@example.com",
      password: "validpassword123",
      confirmPassword: "validpassword123",
    });

    const registerButton = getRegisterButton(wrapper);
    await registerButton.trigger("click");
    await wrapper.vm.$nextTick();

    expect(mockRegister).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "validpassword123",
    });
  });
});
