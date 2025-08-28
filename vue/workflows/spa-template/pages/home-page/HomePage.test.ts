import { describe, it, expect, vi } from "vitest";
import { stubGlobals, getElementByString } from "@saflib/vue/testing";
import { type VueWrapper } from "@vue/test-utils";
import HomePageAsync from "./HomePageAsync.vue";
import { home_page as strings } from "./HomePage.strings.ts";
import { mountTestApp } from "../../test-app.ts";

describe("HomePage", () => {
  stubGlobals();

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_header);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  // TODO: Remove the skip
  it.skip("should render the example strings", async () => {
    const wrapper = mountTestApp(HomePageAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
