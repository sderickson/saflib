import { describe, it, expect } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { getElementByString } from "@saflib/vue-spa/test-utils";
import { type VueWrapper } from "@vue/test-utils";
import LoginPage from "../../pages/login/LoginPage.vue";
import { createAuthRouter } from "../../src/auth-router.ts";
import { login_page } from "./LoginPage.strings.ts";

const router = createAuthRouter();

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

  const mountComponent = () => {
    return mountWithPlugins(LoginPage, {}, { router });
  };

  it("should render the login form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getLoginButton(wrapper).exists()).toBe(true);
  });
});
