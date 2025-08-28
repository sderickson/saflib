import { describe, it, expect } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import LoginPage from "../../pages/login/LoginPage.vue";
import { login_page } from "./LoginPage.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("LoginPage", () => {
  stubGlobals();

  // Helper functions for element selection
  const getEmailInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, login_page.email);
  };

  const getPasswordInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, login_page.password);
  };

  const getLoginButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, login_page.log_in);
  };

  it("should render the login form", () => {
    const wrapper = mountTestApp(LoginPage);
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getLoginButton(wrapper).exists()).toBe(true);
  });
});
