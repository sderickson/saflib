import { describe, it, expect, vi, beforeEach } from "vitest";
import { type VueWrapper } from "@vue/test-utils";
import ForgotPasswordPage from "./ForgotPasswordPage.vue";
import {
  mountWithPlugins,
  withResizeObserverMock,
} from "@saflib/vue-spa-dev/components.ts";
import { router } from "../router";
import { RouterLink } from "vue-router";

withResizeObserverMock(() => {
  describe("ForgotPasswordPage", () => {
    const mountComponent = () => {
      return mountWithPlugins(ForgotPasswordPage, {}, { router });
    };

    // Helper functions for element selection
    const getEmailInput = (wrapper: VueWrapper) => {
      const input = wrapper.find("[placeholder='Email address']");
      expect(input.exists()).toBe(true);
      return input;
    };

    const getResetButton = (wrapper: VueWrapper) => {
      const button = wrapper.find(".v-btn");
      expect(button.exists()).toBe(true);
      expect(button.text()).toBe("Send Reset Link");
      return button;
    };

    const getBackToLoginLink = (wrapper: VueWrapper) => {
      const link = wrapper.findComponent(RouterLink);
      expect(link.exists()).toBe(true);
      expect(link.text()).toContain("Back to Login");
      return link;
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should render the forgot password form", () => {
      const wrapper = mountComponent();

      // Check that all elements are rendered
      expect(getEmailInput(wrapper).exists()).toBe(true);
      expect(getResetButton(wrapper).exists()).toBe(true);
      expect(getBackToLoginLink(wrapper).exists()).toBe(true);

      // Check that the button is initially disabled
      expect(getResetButton(wrapper).attributes("disabled")).toBeDefined();
    });

    it("should validate email format", async () => {
      const wrapper = mountComponent();
      const emailInput = getEmailInput(wrapper);

      // Test invalid email
      await emailInput.setValue("invalid-email");
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain("Email must be valid");
      expect(getResetButton(wrapper).attributes("disabled")).toBeDefined();

      // Test valid email
      await emailInput.setValue("valid@email.com");
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).not.toContain("Email must be valid");
      expect(getResetButton(wrapper).attributes("disabled")).toBeUndefined();
    });

    it("should call sendResetLink when form is submitted", async () => {
      const wrapper = mountComponent();
      const emailInput = getEmailInput(wrapper);
      const resetButton = getResetButton(wrapper);

      // Set up spy on console.log since that's what the current implementation uses
      const consoleSpy = vi.spyOn(console, "log");

      // Fill form with valid data
      await emailInput.setValue("test@example.com");
      await wrapper.vm.$nextTick();

      // Submit form
      await resetButton.trigger("click");
      await wrapper.vm.$nextTick();

      // Verify console.log was called with correct data
      expect(consoleSpy).toHaveBeenCalledWith(
        "send reset link",
        "test@example.com",
        { valid: true }
      );
    });

    it("should navigate to login page when back link is clicked", async () => {
      const wrapper = mountComponent();
      const backLink = getBackToLoginLink(wrapper);

      // Verify the link points to the login page
      expect(backLink.attributes("href")).toBe("/auth/login");
    });
  });
});
