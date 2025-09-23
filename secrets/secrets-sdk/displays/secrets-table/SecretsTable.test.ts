import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretsTable from "./SecretsTable.vue";
import { secrets_table_strings as strings } from "./SecretsTable.strings.ts";
import { mountTestApp, testAppHandlers } from "../../test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing";

describe("SecretsTable", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const waitUntilLoaded = async (wrapper: VueWrapper) => {
    // Wait until skeleton loader is gone and data is loaded
    await vi.waitUntil(() => {
      const skeletonLoader = wrapper.findComponent({ name: "VSkeletonLoader" });
      return !skeletonLoader.exists() && wrapper.text().includes(strings.name);
    }, { timeout: 5000 });
  };

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };


  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(SecretsTable);

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should display secrets in table", async () => {
    const wrapper = mountTestApp(SecretsTable);

    await waitUntilLoaded(wrapper);

    // Check table headers
    expect(wrapper.text()).toContain(strings.name);
    expect(wrapper.text()).toContain(strings.descriptionColumn);
    expect(wrapper.text()).toContain(strings.value);
    expect(wrapper.text()).toContain(strings.status);
    expect(wrapper.text()).toContain(strings.updated);
    expect(wrapper.text()).toContain(strings.actions);

    // Check secret data from mock
    expect(wrapper.text()).toContain("database-password");
    expect(wrapper.text()).toContain("api-key");
  });

  it("should show correct status badges", async () => {
    const wrapper = mountTestApp(SecretsTable);

    await waitUntilLoaded(wrapper);

    // Check for active/inactive status badges
    expect(wrapper.text()).toContain(strings.active);
    expect(wrapper.text()).toContain(strings.inactive);
  });

  it("should show edit/delete buttons", async () => {
    const wrapper = mountTestApp(SecretsTable);

    await waitUntilLoaded(wrapper);

    const editButtons = wrapper.findAll(`[title="${strings.editSecret}"]`);
    const deleteButtons = wrapper.findAll(`[title="${strings.deleteSecret}"]`);
    
    // Should have buttons for each secret
    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it("should format dates correctly", async () => {
    const wrapper = mountTestApp(SecretsTable);

    await waitUntilLoaded(wrapper);

    // Check that dates are formatted (should contain the formatted date)
    const formattedDate = new Date(1640995200000).toLocaleString();
    expect(wrapper.text()).toContain(formattedDate);
  });
});
