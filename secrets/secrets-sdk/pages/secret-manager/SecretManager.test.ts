import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretManagerAsync from "./SecretManagerAsync.vue";
import { secret_manager_page as strings } from "./SecretManager.strings.ts";
import { mountTestApp, testAppHandlers } from "../../test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("SecretManager", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getSecretsTab = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.secretsTab);
  };

  const getAccessRequestsTab = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.accessRequestsTab);
  };

  const getServiceTokensTab = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.serviceTokensTab);
  };

  it("should render the secret manager page with tabs", async () => {
    const wrapper = mountTestApp(SecretManagerAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getTitle(wrapper).exists());
    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getSecretsTab(wrapper).exists()).toBe(true);
    expect(getAccessRequestsTab(wrapper).exists()).toBe(true);
    expect(getServiceTokensTab(wrapper).exists()).toBe(true);
  });
});
