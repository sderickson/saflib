import { describe, it, expect } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue-spa-dev/components";
import { type VueWrapper } from "@vue/test-utils";
import HomePage from "./HomePage.vue";
import { home_page as strings } from "./HomePage.strings.ts";
import { router } from "../../router.ts";
import { getElementByString } from "@saflib/vue-spa/test-utils";
import type { Component } from "vue";

describe("HomePage", () => {
  stubGlobals();

  const mountComponent = (component: Component) => {
    return mountWithPlugins(component, {}, { router });
  };

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_header);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", () => {
    const wrapper = mountComponent(HomePage);
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
