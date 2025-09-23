import { describe, it, expect, beforeEach, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import PendingApprovalsTable from "./PendingApprovalsTable.vue";
import { pending_approvals_table_strings as strings } from "./PendingApprovalsTable.strings.ts";
import { mountTestApp, testAppHandlers } from "../../test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing";
import { TanstackError } from "@saflib/sdk";
import { mockAccessRequests } from "../../requests/access-requests/list.fake.ts";

describe("PendingApprovalsTable", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  const getEmptyText = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.empty);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable);

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should display access requests in table", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: mockAccessRequests,
      },
    });

    // Wait for data to load
    await vi.waitUntil(() => wrapper.text().includes(strings.secretName));

    // Check table headers
    expect(wrapper.text()).toContain(strings.secretName);
    expect(wrapper.text()).toContain(strings.serviceName);
    expect(wrapper.text()).toContain(strings.status);
    expect(wrapper.text()).toContain(strings.requested);
    expect(wrapper.text()).toContain(strings.accessCount);
    expect(wrapper.text()).toContain(strings.actions);

    // Check access request data from mock
    expect(wrapper.text()).toContain("database-password");
    expect(wrapper.text()).toContain("test-service-1");
    expect(wrapper.text()).toContain("api-key");
    expect(wrapper.text()).toContain("test-service-2");
  });

  // it("should show correct status badges", async () => {
  //   const wrapper = mountTestApp(PendingApprovalsTable);

  //   // Wait for data to load
  //   await wrapper.vm.$nextTick();

  //   // Check for status badges
  //   expect(wrapper.text()).toContain(strings.pending);
  //   expect(wrapper.text()).toContain(strings.granted);
  //   expect(wrapper.text()).toContain(strings.denied);
  // });

  // it("should show approve/deny buttons for pending requests", async () => {
  //   const wrapper = mountTestApp(PendingApprovalsTable);

  //   // Wait for data to load
  //   await wrapper.vm.$nextTick();

  //   const approveButtons = wrapper.findAll(`[title="${strings.approve}"]`);
  //   const denyButtons = wrapper.findAll(`[title="${strings.deny}"]`);

  //   // Should have one pending request with action buttons
  //   expect(approveButtons).toHaveLength(1);
  //   expect(denyButtons).toHaveLength(1);
  // });

  // it("should show processed status for non-pending requests", async () => {
  //   const wrapper = mountTestApp(PendingApprovalsTable);

  //   // Wait for data to load
  //   await wrapper.vm.$nextTick();

  //   // Check that processed requests show "Processed" instead of action buttons
  //   expect(wrapper.text()).toContain(strings.processed);
  // });

  // it("should format dates correctly", async () => {
  //   const wrapper = mountTestApp(PendingApprovalsTable);

  //   // Wait for data to load
  //   await wrapper.vm.$nextTick();

  //   // Check that dates are formatted (should contain the formatted date)
  //   const formattedDate = new Date(1640995200000).toLocaleString();
  //   expect(wrapper.text()).toContain(formattedDate);
  // });
});
