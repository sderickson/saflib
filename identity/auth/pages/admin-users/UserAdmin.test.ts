import { describe, it, expect, vi } from "vitest";
import { stubGlobals, setupMockServer } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import { http, HttpResponse } from "msw";
import UserAdmin from "./UserAdmin.vue";
import type { IdentityResponseBody } from "@saflib/identity-spec";
import { mountTestApp } from "../../test-app.ts";

// Use the type from auth-spec
type User = IdentityResponseBody["listUsers"][200][number];

// Mock API response data
const mockUsers: User[] = [
  {
    id: 1,
    email: "admin@example.com",
    createdAt: "2023-10-26T10:00:00.000Z",
    lastLoginAt: "2023-10-27T12:30:00.000Z",
  },
  {
    id: 2,
    email: "user@example.com",
    createdAt: "2023-10-25T09:00:00.000Z",
    lastLoginAt: undefined,
  },
];

// Set up MSW handlers
const handlers = [
  http.get("http://identity.localhost:3000/users", () => {
    return HttpResponse.json(mockUsers);
  }),
];

describe("UserAdmin.vue", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

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
    expect(tableHtml).toContain("admin@example.com");
    expect(tableHtml).toContain("user@example.com");
    expect(tableHtml).toContain("Never"); // For the null lastLoginAt
  });

  it("should display error message on failed fetch", async () => {
    // Override handler for this test
    server.use(
      http.get("http://identity.localhost:3000/users", () => {
        return new HttpResponse("Internal Server Error", { status: 500 });
      }),
    );

    const wrapper = mountTestApp(UserAdmin);

    // Wait for loading to finish
    await vi.waitUntil(() => !getLoadingIndicator(wrapper).exists());
    const errorAlert = getErrorAlert(wrapper);
    expect(errorAlert?.exists()).toBe(true);
    expect(errorAlert?.text()).toContain("Failed to load users");
    expect(getUserListTable(wrapper).exists()).toBe(false);
  });
});
