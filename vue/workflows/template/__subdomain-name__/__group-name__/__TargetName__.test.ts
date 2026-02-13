import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import __FullName__Async from "./__TargetName__Async.vue";
import { __full_name___page as strings } from "./__TargetName__.strings.ts";
import { mountTestApp, testAppHandlers } from "template-package-spa/test-app";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("__FullName__", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountTestApp(__FullName__Async);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
