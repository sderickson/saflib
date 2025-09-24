import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import SecretsPageAsync from "./SecretsPageAsync.vue";
import { Secrets_page_page as strings } from "./SecretsPage.strings.ts";
// TODO: Fix this import to point to the actual one for this package
import { mountTestApp, testAppHandlers } from "../spa-template/test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing";

describe("SecretsPage", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountTestApp(SecretsPageAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
