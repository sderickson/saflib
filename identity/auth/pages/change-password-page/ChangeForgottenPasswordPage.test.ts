import { describe, it, expect } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { mountTestApp } from "../../test-app.ts";
import { type VueWrapper } from "@vue/test-utils";
import ChangeForgottenPasswordPage from "./ChangeForgottenPasswordPage.vue";
import { getElementByString } from "@saflib/vue/testing";
import { change_forgotten_password_page } from "./ChangeForgottenPasswordPage.strings";

describe("ChangeForgottenPasswordPage", () => {
  stubGlobals();

  const getNewPasswordInput = (wrapper: VueWrapper) => {
    return getElementByString(
      wrapper,
      change_forgotten_password_page.new_password,
    );
  };

  const getConfirmPasswordInput = (wrapper: VueWrapper) => {
    return getElementByString(
      wrapper,
      change_forgotten_password_page.confirm_password,
    );
  };

  const getResetButton = (wrapper: VueWrapper) => {
    return getElementByString(
      wrapper,
      change_forgotten_password_page.reset_password_button,
    );
  };

  it("should render the password reset form", () => {
    const wrapper = mountTestApp(ChangeForgottenPasswordPage);
    expect(getNewPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getResetButton(wrapper).exists()).toBe(true);
  });
});
