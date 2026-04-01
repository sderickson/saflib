import { afterEach, describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import recoveryAsync from "./RecoveryAsync.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "@saflib/ory-kratos-spa/test-app";
import { resetKratosFlowMocks } from "@saflib/ory-kratos-sdk/fakes";
import { setupMockServer } from "@saflib/sdk/testing/mock";

// Renders the page to capture baseline coverage.
// Uncovered lines after this indicate logic worth extracting to .logic.ts or composables.

describe("recovery", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);
  afterEach(resetKratosFlowMocks);

  it("should render", async () => {
    const router = createTestRouter();
    // TODO: replace any route params (e.g. :id) with actual test values
    await router.push({
      path: "/recovery",
      query: { flow: "mock-recovery-flow" },
    });
    await router.isReady();

    const wrapper = mountTestApp(recoveryAsync, {}, { router });
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Reset your password"),
    );
    wrapper.unmount();
  });
});
