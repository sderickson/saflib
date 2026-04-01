import { afterEach, describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import registrationAsync from "./RegistrationAsync.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "@saflib/ory-kratos-spa/test-app";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { resetKratosFlowMocks } from "@saflib/ory-kratos-sdk/fakes";

// Renders the page to capture baseline coverage.
// Uncovered lines after this indicate logic worth extracting to .logic.ts or composables.

describe("registration", () => {
  stubGlobals();
  setupMockServer(testAppHandlers);
  afterEach(resetKratosFlowMocks);

  it("should render", async () => {
    const router = createTestRouter();
    await router.push("/registration?flow=mock-registration-flow");
    await router.isReady();

    const wrapper = mountTestApp(registrationAsync, {}, { router });
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Create your account"),
    );
    wrapper.unmount();
  });
});
