import { describe, it, expect } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import type { VueWrapper } from "@vue/test-utils";
import ForgotPasswordPage from "./ForgotPasswordPage.vue";
import { getElementByString } from "@saflib/vue/testing";
import { forgot_password_page } from "./ForgotPasswordPage.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("ForgotPasswordPage", () => {
  stubGlobals();

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, forgot_password_page.email_address);
  };

  const getSubmitButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, forgot_password_page.send_reset_link);
  };

  it("should render the form", () => {
    const wrapper = mountTestApp(ForgotPasswordPage);
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getSubmitButton(wrapper).exists()).toBe(true);
    expect(wrapper.text()).toContain("Reset Password");
  });
});
