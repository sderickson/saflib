import { describe, it, expect } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import type { VueWrapper } from "@vue/test-utils";
import ForgotPasswordPage from "./ForgotPasswordPage.vue";
import { createAuthRouter } from "../../src/auth-router.ts";
import { getElementByString } from "@saflib/vue-spa/test-utils";
import { forgot_password_page } from "./ForgotPasswordPage.strings.ts";

const router = createAuthRouter();

describe("ForgotPasswordPage", () => {
  stubGlobals();

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, forgot_password_page.email_address);
  };

  const getSubmitButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, forgot_password_page.send_reset_link);
  };

  const mountComponent = () => {
    return mountWithPlugins(ForgotPasswordPage, {}, { router });
  };

  it("should render the form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getSubmitButton(wrapper).exists()).toBe(true);
    expect(wrapper.text()).toContain("Reset Password");
  });
});
