import { describe, it, expect } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import ChangeForgottenPasswordPage from "./ChangeForgottenPasswordPage.vue";
import { createAuthRouter } from "../../auth-router.ts";
import { getElementByString } from "@saflib/vue-spa/test-utils";

import { change_forgotten_password_page } from "./ChangeForgottenPasswordPage.strings";

const router = createAuthRouter();

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

  const mountComponent = () => {
    return mountWithPlugins(ChangeForgottenPasswordPage, {}, { router });
  };

  it("should render the password reset form", () => {
    const wrapper = mountComponent();
    expect(getNewPasswordInput(wrapper).exists()).toBe(true);
    expect(getConfirmPasswordInput(wrapper).exists()).toBe(true);
    expect(getResetButton(wrapper).exists()).toBe(true);
  });
});
