import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretsTable from "./SecretsTable.vue";
import { secrets_table_strings as strings } from "./SecretsTable.strings.ts";
import { mountTestApp, testAppHandlers } from "../../test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing";
import type { Secret } from "@saflib/secrets-spec";

describe("SecretsTable", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const mockSecrets: Secret[] = [
    {
      id: "secret-1",
      name: "database-password",
      description: "Database connection password",
      masked_value: "db_pass***",
      created_at: 1640995200000,
      updated_at: 1640995200000,
      is_active: true,
    },
    {
      id: "secret-2",
      name: "api-key",
      description: "External API key",
      masked_value: "api_key***",
      created_at: 1640995100000,
      updated_at: 1640995300000,
      is_active: false,
    },
  ];

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getDescription = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.description);
  };

  const getLoadingText = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.loading);
  };

  const getErrorText = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.error);
  };

  const getEmptyText = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.empty);
  };

  it("should render the component with title and description", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: [],
        loading: false,
      },
    });

    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getDescription(wrapper).exists()).toBe(true);
  });

  it("should show loading state", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: [],
        loading: true,
      },
    });

    expect(getLoadingText(wrapper).exists()).toBe(true);
  });

  it("should show error state", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: [],
        loading: false,
        error: "Failed to load secrets",
      },
    });

    expect(wrapper.text()).toContain(strings.error);
    expect(wrapper.text()).toContain("Failed to load secrets");
  });

  it("should show empty state when no secrets", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: [],
        loading: false,
      },
    });

    expect(getEmptyText(wrapper).exists()).toBe(true);
  });

  it("should display secrets in table", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: mockSecrets,
        loading: false,
      },
    });

    // Check table headers
    expect(wrapper.text()).toContain(strings.name);
    expect(wrapper.text()).toContain(strings.descriptionColumn);
    expect(wrapper.text()).toContain(strings.value);
    expect(wrapper.text()).toContain(strings.status);
    expect(wrapper.text()).toContain(strings.updated);
    expect(wrapper.text()).toContain(strings.actions);

    // Check secret data
    expect(wrapper.text()).toContain("database-password");
    expect(wrapper.text()).toContain("Database connection password");
    expect(wrapper.text()).toContain("db_pass***");
    expect(wrapper.text()).toContain("api-key");
    expect(wrapper.text()).toContain("External API key");
    expect(wrapper.text()).toContain("api_key***");
  });

  it("should show correct status badges", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: mockSecrets,
        loading: false,
      },
    });

    // Check for active/inactive status badges
    expect(wrapper.text()).toContain(strings.active);
    expect(wrapper.text()).toContain(strings.inactive);
  });

  it("should emit edit event when edit button is clicked", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: mockSecrets,
        loading: false,
      },
    });

    const editButtons = wrapper.findAll(`[title="${strings.editSecret}"]`);
    expect(editButtons).toHaveLength(2);

    await editButtons[0].trigger("click");

    expect(wrapper.emitted("edit")).toBeTruthy();
    expect(wrapper.emitted("edit")![0]).toEqual([mockSecrets[0]]);
  });

  it("should emit delete event when delete button is clicked", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: mockSecrets,
        loading: false,
      },
    });

    const deleteButtons = wrapper.findAll(`[title="${strings.deleteSecret}"]`);
    expect(deleteButtons).toHaveLength(2);

    await deleteButtons[0].trigger("click");

    expect(wrapper.emitted("delete")).toBeTruthy();
    expect(wrapper.emitted("delete")![0]).toEqual([mockSecrets[0]]);
  });

  it("should format dates correctly", async () => {
    const wrapper = mountTestApp(SecretsTable, {
      props: {
        secrets: mockSecrets,
        loading: false,
      },
    });

    // Check that dates are formatted (should contain the formatted date)
    const formattedDate = new Date(1640995200000).toLocaleString();
    expect(wrapper.text()).toContain(formattedDate);
  });
});
