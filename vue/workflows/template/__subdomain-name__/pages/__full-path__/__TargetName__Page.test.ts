import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import __TargetName__Async from "./__TargetName__PageAsync.vue";
import { __target_name___page as strings } from "./__TargetName__Page.strings.ts";
// TODO: Fix this import to point to the actual one for this package
import { mountTestApp, testAppHandlers } from "~/test-app.ts";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("__TargetName__", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountTestApp(__TargetName__Async);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
