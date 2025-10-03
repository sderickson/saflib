import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { type VueWrapper } from "@vue/test-utils";
import UserAdmin from "./UserAdmin.vue";
import { mountTestApp } from "../../test-app.ts";
import {
  identityServiceFakeHandlers,
  identityServiceFakeConstants,
} from "../../fakes.ts";

const handlers = [...identityServiceFakeHandlers];

describe("UserAdmin.vue", () => {
  stubGlobals();
  setupMockServer(handlers);

  const getLoadingIndicator = (wrapper: VueWrapper) => {
    return wrapper.findComponent({ name: "v-progress-circular" });
  };

  const getErrorAlert = (wrapper: VueWrapper) => {
    const alert = wrapper.findComponent({ name: "v-alert" });
    // Check if it's the error alert we expect
    return alert.exists() && alert.props("type") === "error" ? alert : null;
  };

  const getUserListTable = (wrapper: VueWrapper) => {
    // UserList component might render a v-table
    return wrapper.findComponent({ name: "v-table" });
  };

  // --- Tests --- //

  it("should show loading indicator initially", () => {
    const wrapper = mountTestApp(UserAdmin);
    expect(getLoadingIndicator(wrapper).exists()).toBe(true);
    expect(getUserListTable(wrapper).exists()).toBe(false);
    expect(getErrorAlert(wrapper)).toBeNull();
  });

  it("should display user list on successful fetch", async () => {
    const wrapper = mountTestApp(UserAdmin);

    // Wait for loading to finish
    await vi.waitUntil(() => !getLoadingIndicator(wrapper).exists());

    const table = getUserListTable(wrapper);
    expect(table.exists()).toBe(true);
    expect(getErrorAlert(wrapper)).toBeNull();

    // Check if user data is rendered (basic check)
    const tableHtml = table.html();
    expect(tableHtml).toContain(identityServiceFakeConstants.defaultUser.email);
    expect(tableHtml).toContain("Never"); // For the null lastLoginAt
  });
});
