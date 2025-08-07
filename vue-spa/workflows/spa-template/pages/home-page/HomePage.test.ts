import { describe, it, expect, vi } from "vitest";
import {
  stubGlobals,
  mountWithPlugins,
  setupMockServer,
} from "@saflib/vue-spa/testing";
import { type VueWrapper } from "@vue/test-utils";
import HomePageAsync from "./HomePageAsync.vue";
import { home_page as strings } from "./HomePage.strings.ts";
import { router } from "../../router.ts";
import { getElementByString } from "@saflib/vue-spa/test-utils";
import type { Component } from "vue";
import { http, HttpResponse } from "msw";
import type { AuthResponse } from "@saflib/identity-spec"; // TODO: import the appropriate spec

const handlers = [
  http.get("http://identity.localhost:3000/users", () => {
    return HttpResponse.json([] satisfies AuthResponse["listUsers"]["200"]); // TODO: enforce the correct response type
  }),
];

describe("HomePage", () => {
  stubGlobals();

  setupMockServer(handlers);
  /*
    For tests which test different responses, use the following pattern:
      server.use(
      http.get("http://identity.localhost:3000/users", () => {
        return HttpResponse.json(updatedResponse);
      }),
    );
  */

  const mountComponent = (component: Component) => {
    return mountWithPlugins(component, {}, { router });
  };

  const getExampleHeader = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_header);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountComponent(HomePageAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getExampleHeader(wrapper).exists());
    expect(getExampleHeader(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
  });
});
