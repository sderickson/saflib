import { describe, it, expect } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import PendingApprovalsTable from "./PendingApprovalsTable.vue";
import { pending_approvals_table_strings as strings } from "./PendingApprovalsTable.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import { accessRequestStubs } from "../../requests/access-requests/list.fake.ts";

describe("PendingApprovalsTable", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: [],
        loading: false,
      },
    });

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should show loading state", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: [],
        loading: true,
      },
    });

    // Check for skeleton loader
    expect(wrapper.findComponent({ name: "VSkeletonLoader" }).exists()).toBe(
      true,
    );
  });

  it("should show error state", async () => {
    const error = new Error("Test error");
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: [],
        loading: false,
        error,
      },
    });

    expect(wrapper.text()).toContain("Test error");
  });

  it("should show empty state when no access requests", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: [],
        loading: false,
      },
    });

    expect(wrapper.text()).toContain(strings.empty);
  });

  it("should display access requests in table", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: accessRequestStubs,
        loading: false,
      },
    });

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

  it("should show correct status badges", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: accessRequestStubs,
        loading: false,
      },
    });

    // Check for status badges
    expect(wrapper.text()).toContain(strings.pending);
    expect(wrapper.text()).toContain(strings.granted);
    expect(wrapper.text()).toContain(strings.denied);
  });

  it("should show approve/deny buttons for pending requests", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: accessRequestStubs,
        loading: false,
      },
    });

    const approveButtons = wrapper.findAll(`[title="${strings.approve}"]`);
    const denyButtons = wrapper.findAll(`[title="${strings.deny}"]`);

    // Should have one pending request with action buttons
    expect(approveButtons).toHaveLength(1);
    expect(denyButtons).toHaveLength(1);
  });

  it("should show processed status for non-pending requests", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: accessRequestStubs,
        loading: false,
      },
    });

    // Check that processed requests show "Processed" instead of action buttons
    expect(wrapper.text()).toContain(strings.processed);
  });

  it("should format dates correctly", async () => {
    const wrapper = mountTestApp(PendingApprovalsTable, {
      props: {
        accessRequests: accessRequestStubs,
        loading: false,
      },
    });

    // Check that dates are formatted (should contain the formatted date)
    const formattedDate = new Date(1640995200000).toLocaleString();
    expect(wrapper.text()).toContain(formattedDate);
  });
});
