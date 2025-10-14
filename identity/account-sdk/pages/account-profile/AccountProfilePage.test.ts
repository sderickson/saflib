import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import AccountProfilePageAsync from "./AccountProfilePageAsync.vue";
import { account_profile_page as strings } from "./AccountProfilePage.strings.ts";
import { getElementByString } from "@saflib/vue/testing";
import { http, HttpResponse } from "msw";
import type { IdentityResponseBody } from "@saflib/identity-spec";
import { mountTestApp } from "../../test-app.ts";

const mockProfileData = {
  id: "123",
  name: "George Saines",
  email: "gsaines@gmail.com",
  emailVerified: true,
} satisfies IdentityResponseBody["getUserProfile"][200];

const handlers = [
  http.get("http://identity.localhost:3000/auth/profile", () => {
    return HttpResponse.json(mockProfileData);
  }),
];

describe("AccountProfilePage", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();

  const getPageTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.page_title);
  };

  const getBreadcrumbAccount = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.breadcrumb_account);
  };

  const getBreadcrumbEditPersonalDetails = (wrapper: VueWrapper) => {
    return getElementByString(
      wrapper,
      strings.breadcrumb_edit_personal_details,
    );
  };

  const getSaveButton = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.save_button);
  };

  it("should render the profile form with correct elements", async () => {
    const wrapper = mountTestApp(AccountProfilePageAsync);

    await vi.waitFor(() => getPageTitle(wrapper).exists());
    expect(getPageTitle(wrapper).exists()).toBe(true);
    expect(getBreadcrumbAccount(wrapper).exists()).toBe(true);
    expect(getBreadcrumbEditPersonalDetails(wrapper).exists()).toBe(true);
    expect(getSaveButton(wrapper).exists()).toBe(true);

    // Verify form fields are rendered with proper data
    await vi.waitFor(() => wrapper.text().includes("George"));
    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);
  });
});
