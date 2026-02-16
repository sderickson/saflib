import { describe, it, expect, vi } from "vitest";
import { stubGlobals, mountWithPlugins } from "@saflib/vue/testing";
import { createRouter, createMemoryHistory } from "vue-router";
import { PageNotFound } from "@saflib/vue/components";
import __SubdomainName__Spa from "./__SubdomainName__Spa.vue";
import { testAppHandlers } from "./test-app.ts";
import { __subdomain_name___strings } from "./strings.ts";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("__SubdomainName__Spa", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  it("should render the shell for an unknown route", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:pathMatch(.*)*", component: PageNotFound }],
    });
    await router.push("/404");
    await router.isReady();

    const wrapper = mountWithPlugins(__SubdomainName__Spa, {}, {
      router,
      i18nMessages: __subdomain_name___strings,
    });
    await vi.waitFor(() => expect(wrapper.text()).toContain("Page Not Found"));
    wrapper.unmount();
  });
});
