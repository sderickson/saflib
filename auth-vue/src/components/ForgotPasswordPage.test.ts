import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  withResizeObserverMock,
  mountWithPlugins,
} from "@saflib/vue-spa-dev/components";
import type { VueWrapper } from "@vue/test-utils";
import ForgotPasswordPage from "./ForgotPasswordPage.vue";
import { router } from "../router";
import { VAlert } from "vuetify/components";
import { client } from "../client";

// Mock the client
vi.mock("../client", () => ({
  client: {
    POST: vi.fn(),
  },
}));

withResizeObserverMock(() => {
  describe("ForgotPasswordPage", () => {
    // Helper functions for element selection
    const getEmailInput = (wrapper: VueWrapper) => {
      const emailInput = wrapper.find("[placeholder='Email address']");
      expect(emailInput.exists()).toBe(true);
      return emailInput;
    };

    const getSubmitButton = (wrapper: VueWrapper) => {
      const button = wrapper.find("button");
      expect(button.exists()).toBe(true);
      return button;
    };

    const getSuccessAlert = (wrapper: VueWrapper) => {
      const alert = wrapper.find(".v-alert--success");
      return alert;
    };

    const getErrorAlert = (wrapper: VueWrapper) => {
      const alerts = wrapper.findAllComponents(VAlert);
      return alerts.find((alert) => alert.props().type === "error");
    };

    const mountComponent = () => {
      return mountWithPlugins(ForgotPasswordPage, {}, { router });
    };

    beforeEach(() => {
      vi.clearAllMocks();
      // Reset the mock implementation
      (client.POST as any).mockResolvedValue({ data: null, error: null });
    });

    it("should render the form", () => {
      const wrapper = mountComponent();
      expect(getEmailInput(wrapper).exists()).toBe(true);
      expect(getSubmitButton(wrapper).exists()).toBe(true);
      expect(wrapper.text()).toContain("Reset Password");
    });

    it("should validate email format", async () => {
      const wrapper = mountComponent();
      const emailInput = getEmailInput(wrapper);

      // Test invalid email
      await emailInput.setValue("invalid-email");
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain("Must be a valid email");

      // Test valid email
      await emailInput.setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).not.toContain("Must be a valid email");
    });

    it("should disable submit button when form is invalid", async () => {
      const wrapper = mountComponent();
      const submitButton = getSubmitButton(wrapper);

      // Initially disabled
      expect(submitButton.attributes("disabled")).toBeDefined();

      // After valid input
      await getEmailInput(wrapper).setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      expect(submitButton.attributes("disabled")).toBeUndefined();
    });

    it("should show loading state during submission", async () => {
      const wrapper = mountComponent();
      const submitButton = getSubmitButton(wrapper);
      const emailInput = getEmailInput(wrapper);

      // Mock the client to simulate a delayed response
      vi.mocked(client.POST).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      await emailInput.setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      await submitButton.trigger("click");

      expect(submitButton.text()).toBe("Sending...");
      expect(emailInput.attributes("disabled")).toBeDefined();
    });

    it("should show success message after successful submission", async () => {
      const wrapper = mountComponent();
      const emailInput = getEmailInput(wrapper);
      const submitButton = getSubmitButton(wrapper);

      // Mock successful response
      (client.POST as any).mockResolvedValue({
        data: {
          success: true,
          message: "If an account exists with this email",
        },
        error: null,
      });

      await emailInput.setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      await submitButton.trigger("click");
      await wrapper.vm.$nextTick();

      const successAlert = getSuccessAlert(wrapper);
      expect(successAlert.exists()).toBe(true);
      expect(successAlert.text()).toContain(
        "If an account exists with this email",
      );
      expect(client.POST).toHaveBeenCalledWith("/auth/forgot-password", {
        body: { email: "valid@email.com" },
      });
    });

    it("should show error message after failed submission", async () => {
      const wrapper = mountComponent();
      const emailInput = getEmailInput(wrapper);
      const submitButton = getSubmitButton(wrapper);

      // Mock error response
      (client.POST as any).mockResolvedValue({
        data: null,
        error: new Error("API Error"),
      });

      await emailInput.setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      await submitButton.trigger("click");
      await wrapper.vm.$nextTick();

      const errorAlert = getErrorAlert(wrapper);
      expect(errorAlert).toBeDefined();
      expect(errorAlert?.text()).toContain("An error occurred");
      expect(client.POST).toHaveBeenCalledWith("/auth/forgot-password", {
        body: { email: "valid@email.com" },
      });
    });
  });
});
