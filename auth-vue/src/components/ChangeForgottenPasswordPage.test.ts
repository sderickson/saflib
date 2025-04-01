import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import { setupMockServer } from "@saflib/vue-spa-dev/components";
import ChangeForgottenPasswordPage from "./ChangeForgottenPasswordPage.vue";
import { router } from "../router";

// Set up MSW server
const handlers = [
  http.post(
    "http://api.localhost:3000/auth/reset-password",
    async ({ request }) => {
      const body = (await request.json()) as {
        token: string;
        newPassword: string;
      };
      if (body.token === "valid-token") {
        return HttpResponse.json({
          success: true,
          data: {
            message: "Password reset successfully",
          },
        });
      }
      return new HttpResponse(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 404,
        },
      );
    },
  ),
];

describe("ChangeForgottenPasswordPage", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  // Helper functions for element selection
  const getTemporaryPasswordInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const input = inputs.find(
      (input) => input.props("placeholder") === "Temporary Password",
    );
    expect(input?.exists()).toBe(true);
    return input!;
  };

  const getNewPasswordInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const input = inputs.find(
      (input) => input.props("placeholder") === "New Password",
    );
    expect(input?.exists()).toBe(true);
    return input!;
  };

  const getConfirmPasswordInput = (wrapper: VueWrapper) => {
    const inputs = wrapper.findAllComponents({ name: "v-text-field" });
    const input = inputs.find(
      (input) => input.props("placeholder") === "Confirm New Password",
    );
    expect(input?.exists()).toBe(true);
    return input!;
  };

  const getResetButton = (wrapper: VueWrapper) => {
    const buttons = wrapper.findAllComponents({ name: "v-btn" });
    const resetButton = buttons.find(
      (button) => button.text() === "Reset Password",
    );
    expect(resetButton?.exists()).toBe(true);
    return resetButton!;
  };

  const mountComponent = (token: string = "valid-token") => {
    return mountWithPlugins(
      ChangeForgottenPasswordPage,
      {
        global: {
          mocks: {
            $route: {
              query: { token },
            },
          },
        },
      },
      { router },
    );
  };

  const fillPasswordForm = async (
    wrapper: VueWrapper,
    {
      temporaryPassword,
      newPassword,
      confirmPassword,
    }: {
      temporaryPassword: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) => {
    await getTemporaryPasswordInput(wrapper).setValue(temporaryPassword);
    await getNewPasswordInput(wrapper).setValue(newPassword);
    await getConfirmPasswordInput(wrapper).setValue(confirmPassword);
    await wrapper.vm.$nextTick();
  };

  it("should render the password reset form", () => {
    const wrapper = mountComponent();
    expect(getTemporaryPasswordInput(wrapper).exists()).toBe(true);
    expect(getNewPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getResetButton(wrapper).exists()).toBe(true);
  });

  it("should disable reset button when form is invalid", async () => {
    const wrapper = mountComponent();
    const resetButton = getResetButton(wrapper);

    // Initially disabled
    expect(resetButton.attributes("disabled")).toBe("");

    // Invalid - missing temporary password
    await fillPasswordForm(wrapper, {
      temporaryPassword: "",
      newPassword: "validpassword123",
      confirmPassword: "validpassword123",
    });
    expect(resetButton.attributes("disabled")).toBe("");

    // Invalid - passwords don't match
    await fillPasswordForm(wrapper, {
      temporaryPassword: "temp123",
      newPassword: "validpassword123",
      confirmPassword: "differentpassword",
    });
    expect(resetButton.attributes("disabled")).toBe("");

    // Invalid - password too short
    await fillPasswordForm(wrapper, {
      temporaryPassword: "temp123",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(resetButton.attributes("disabled")).toBe("");

    // Valid form
    await fillPasswordForm(wrapper, {
      temporaryPassword: "temp123",
      newPassword: "validpassword123",
      confirmPassword: "validpassword123",
    });
    expect(resetButton.attributes("disabled")).toBeUndefined();
  });

  it("should show success message and hide form after successful password reset", async () => {
    const wrapper = mountComponent("valid-token");
    const resetButton = getResetButton(wrapper);

    await fillPasswordForm(wrapper, {
      temporaryPassword: "temp123",
      newPassword: "validpassword123",
      confirmPassword: "validpassword123",
    });

    await resetButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for success message
    const successAlert = await vi.waitUntil(() => {
      const alerts = wrapper.findAllComponents({ name: "v-alert" });
      return alerts.find((alert) => alert.props("type") === "success");
    });
    expect(successAlert?.text()).toContain("Password successfully reset!");

    // Verify form is hidden
    const form = wrapper.findComponent({ name: "v-form" });
    expect(form.exists()).toBe(false);

    // Verify login link is shown
    const loginLink = wrapper.findComponent({ name: "router-link" });
    expect(loginLink.text()).toContain("Continue to Login");
  });

  it("should show error message when token is invalid", async () => {
    const wrapper = mountComponent("invalid-token");
    const resetButton = getResetButton(wrapper);

    await fillPasswordForm(wrapper, {
      temporaryPassword: "temp123",
      newPassword: "validpassword123",
      confirmPassword: "validpassword123",
    });

    await resetButton.trigger("click");
    await wrapper.vm.$nextTick();

    // Wait for error message
    const errorAlert = await vi.waitUntil(
      () => {
        const alerts = wrapper.findAllComponents({ name: "v-alert" });
        return alerts.find((alert) => alert.props("type") === "error");
      },
      { timeout: 1000 },
    );
    expect(errorAlert?.text()).toContain("Failed to reset password");
  });
});
