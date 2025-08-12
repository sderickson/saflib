import { describe, it, expect, vi } from "vitest";
import {
  stubGlobals,
  mountWithPlugins,
  setupMockServer,
} from "@saflib/vue-spa/testing";
import { type VueWrapper } from "@vue/test-utils";
import TemplateFileAsync from "./TemplateFileAsync.vue";
import { TemplateFile_page as strings } from "./TemplateFile.strings.ts";
// TODO: uncomment this and point the import to the actual package router
// import { router } from "../../router.ts";
import { getElementByString } from "@saflib/vue-spa/testing";
import type { Component } from "vue";
import { http, HttpResponse } from "msw";
import type { AuthResponse } from "@saflib/identity-spec"; // TODO: import the appropriate spec

// TODO: update with mock responses for the actual API calls made in the loader
const handlers = [
  http.get("http://identity.localhost:3000/users", () => {
    return HttpResponse.json([] satisfies AuthResponse["listUsers"]["200"]); // TODO: enforce the correct response type
  }),
];

describe("TemplateFile", () => {
  stubGlobals();

  const server = setupMockServer(handlers);
  expect(server).toBeDefined();
  /*
    For tests which test different responses, use the following pattern:
      server.use(
      http.get("http://identity.localhost:3000/users", () => {
        return HttpResponse.json(updatedResponse);
      }),
    );
  */

  const mountComponent = (component: Component) => {
    return mountWithPlugins(
      component,
      {},
      {
        // TODO: uncomment this after you've imported the actual router
        //  router
      },
    );
  };

  const getTitle = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.title);
  };

  const getExampleInput = (wrapper: VueWrapper) => {
    return getElementByString(wrapper, strings.example_input);
  };

  it("should render the example strings", async () => {
    const wrapper = mountComponent(TemplateFileAsync);
    // first expectation should "waitFor" since this test includes loading code and fetching data
    await vi.waitFor(() => getTitle(wrapper).exists());
    expect(getTitle(wrapper).exists()).toBe(true);
    expect(getExampleInput(wrapper).exists()).toBe(true);
    // TODO: add a check for the raw, printed data from the loader
  });
});
