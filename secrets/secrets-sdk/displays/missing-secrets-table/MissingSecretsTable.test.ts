import { describe, it, expect } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import MissingSecretsTable from "./MissingSecretsTable.vue";
import { missing_secrets_table_strings as strings } from "./MissingSecretsTable.strings.ts";
import { mountTestApp } from "../../test-app.ts";
import { accessRequestStubs } from "../../requests/access-requests/list.fake.ts";

describe("MissingSecretsTable", () => {
  stubGlobals();

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: [],
        loading: false,
      },
    });

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should show loading state", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: [],
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
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: [],
        loading: false,
        error,
      },
    });

    expect(wrapper.text()).toContain("Test error");
  });

  it("should show empty state when no missing secrets", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: [],
        loading: false,
      },
    });

    expect(wrapper.text()).toContain(strings.empty);
  });

  it("should display missing secrets in table", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    // Check table headers
    expect(wrapper.text()).toContain(strings.secretName);
    expect(wrapper.text()).toContain(strings.serviceName);
    expect(wrapper.text()).toContain(strings.status);
    expect(wrapper.text()).toContain(strings.requested);
    expect(wrapper.text()).toContain(strings.actions);

    // Check missing secret data
    expect(wrapper.text()).toContain("database-password");
    expect(wrapper.text()).toContain("test-service-1");
    expect(wrapper.text()).toContain("api-key");
    expect(wrapper.text()).toContain("test-service-2");
  });

  it("should show correct status badges", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    // Check for status badges
    expect(wrapper.text()).toContain(strings.missing);
    expect(wrapper.text()).toContain(strings.pending);
  });

  it("should show create/view buttons", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    const createButtons = wrapper.findAll(`[title="${strings.createSecret}"]`);
    const viewButtons = wrapper.findAll(`[title="${strings.viewDetails}"]`);

    // Should have buttons for each missing secret
    expect(createButtons.length).toBeGreaterThan(0);
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it("should emit createSecret event when create button is clicked", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    const createButtons = wrapper.findAll(`[title="${strings.createSecret}"]`);

    await createButtons[0].trigger("click");

    expect(wrapper.emitted("createSecret")).toBeTruthy();
    expect(wrapper.emitted("createSecret")![0]).toEqual([
      accessRequestStubs[0],
    ]);
  });

  it("should emit viewDetails event when view button is clicked", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    const viewButtons = wrapper.findAll(`[title="${strings.viewDetails}"]`);
    expect(viewButtons).toHaveLength(accessRequestStubs.length);

    await viewButtons[0].trigger("click");

    expect(wrapper.emitted("viewDetails")).toBeTruthy();
    expect(wrapper.emitted("viewDetails")![0]).toEqual([accessRequestStubs[0]]);
  });

  it("should format dates correctly", async () => {
    const wrapper = mountTestApp(MissingSecretsTable, {
      props: {
        missingSecrets: accessRequestStubs,
        loading: false,
      },
    });

    // Check that dates are formatted (should contain the formatted date)
    const formattedDate = new Date(1640995200000).toLocaleString();
    expect(wrapper.text()).toContain(formattedDate);
  });
});
