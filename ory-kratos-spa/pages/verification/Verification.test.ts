import { afterEach, describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import verificationAsync from "./VerificationAsync.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "@saflib/ory-kratos-spa/test-app";
import { resetKratosFlowMocks } from "@saflib/ory-kratos-sdk/fakes";
import { setupMockServer } from "@saflib/sdk/testing/mock";

// Renders the page to capture baseline coverage.
// Uncovered lines after this indicate logic worth extracting to .logic.ts or composables.

describe("verification", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);
  afterEach(resetKratosFlowMocks);

  it("should render", async () => {
    const router = createTestRouter();
    await router.push({
      path: "/verification",
      query: { flow: "mock-verification-flow" },
    });
    await router.isReady();

    const wrapper = mountTestApp(verificationAsync, {}, { router });
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Verify your email"),
    );
    wrapper.unmount();
  });
});
