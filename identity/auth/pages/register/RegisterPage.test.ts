import { describe, it, expect } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import RegisterPage from "./RegisterPage.vue";
import { getElementByString } from "@saflib/vue/testing";
import { register_page } from "./RegisterPage.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("RegisterPage", () => {
  stubGlobals();

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, register_page.email);
  };

  const getPasswordInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, register_page.password);
  };

  const getConfirmPasswordInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, register_page.confirm_password);
  };

  const getRegisterButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, register_page.register);
  };

  it("should render the registration form", () => {
    const wrapper = mountTestApp(RegisterPage);
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getRegisterButton(wrapper).exists()).toBe(true);
  });
});
