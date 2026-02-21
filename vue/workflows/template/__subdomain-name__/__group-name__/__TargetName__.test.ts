import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import __FullName__Async from "./__TargetName__Async.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "template-package-spa/test-app";
import { setupMockServer } from "@saflib/sdk/testing/mock";

// Renders the page to capture baseline coverage.
// Uncovered lines after this indicate logic worth extracting to .logic.ts or composables.

describe("__FullName__", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);

  it("should render", async () => {
    const router = createTestRouter();
    // TODO: replace any route params (e.g. :id) with actual test values
    await router.push("__url-path__");
    await router.isReady();

    const wrapper = mountTestApp(__FullName__Async, {}, { router });
    // TODO: replace "TODO" with a visible string from the rendered page
    await vi.waitFor(() => expect(wrapper.text()).toContain("Hello"));
    wrapper.unmount();
  });
});
