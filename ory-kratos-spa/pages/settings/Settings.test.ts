import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import settingsAsync from "./SettingsAsync.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "@saflib/ory-kratos-spa/test-app";
import {
  kratosSessionLoggedInHandler,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import { setupMockServer } from "@saflib/sdk/testing/mock";

describe("settings", () => {
  stubGlobals();
  const server = setupMockServer(testAppHandlers);
  beforeEach(() => {
    server.use(kratosSessionLoggedInHandler);
  });
  afterEach(resetKratosFlowMocks);

  it("should render", async () => {
    const router = createTestRouter();
    await router.push({
      path: "/settings",
      query: { flow: "mock-settings-flow" },
    });
    await router.isReady();

    const wrapper = mountTestApp(settingsAsync, {}, { router });
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Account settings"),
    );
    wrapper.unmount();
  });
});
