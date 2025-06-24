import { describe, it, expect, vi } from "vitest";
import {
  stubGlobals,
  mountWithPlugins,
  setupMockServer,
} from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import RegisterPage from "./RegisterPage.vue";
import { createAuthRouter } from "../../src/auth-router.ts";
import { getElementByString } from "@saflib/vue-spa/test-utils";
import { register_page } from "./RegisterPage.strings.ts";

const router = createAuthRouter();

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

  const mountComponent = () => {
    return mountWithPlugins(RegisterPage, {}, { router });
  };

  it("should render the registration form", () => {
    const wrapper = mountComponent();
    expect(getEmailInput(wrapper).exists()).toBe(true);
    expect(getPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getRegisterButton(wrapper).exists()).toBe(true);
  });
});
