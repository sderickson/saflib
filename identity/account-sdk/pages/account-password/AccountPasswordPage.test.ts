import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import AccountPasswordPageAsync from "./AccountPasswordPageAsync.vue";
import { account_password_page as strings } from "./AccountPasswordPage.strings.ts";
import { getElementByString } from "@saflib/vue/testing";
import { mountTestApp } from "../../test-app.ts";
import { identityServiceFakeHandlers } from "@saflib/auth/fakes";

const handlers = [...identityServiceFakeHandlers];

describe("AccountPasswordPage", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();

  const getPageTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.page_title);
  };

  const getSaveButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.save_button);
  };

  it("should render the password change form", async () => {
    const wrapper = mountTestApp(AccountPasswordPageAsync);
    await vi.waitFor(() => getPageTitle(wrapper).exists());
    expect(getPageTitle(wrapper).exists()).toBe(true);
    expect(getSaveButton(wrapper).exists()).toBe(true);
  });
});
