import { http, HttpResponse } from "msw";
import { afterEach, describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import KratosVerifyWallAsync from "./VerifyWallAsync.vue";
import {
  mountTestApp,
  createTestRouter,
  testAppHandlers,
} from "@saflib/ory-kratos-spa/test-app";
import { resetKratosFlowMocks } from "@saflib/ory-kratos-sdk/fakes";
import { setupMockServer } from "@saflib/sdk/testing/mock";

const unverifiedSession = {
  id: "sess-1",
  active: true,
  identity: {
    id: "id-1",
    schema_id: "default",
    schema_url: "",
    traits: { email: "user@test.dev" },
    verifiable_addresses: [
      {
        id: "va-1",
        value: "user@test.dev",
        verified: false,
        status: "pending",
        via: "email",
      },
    ],
  },
};

describe("KratosVerifyWall", () => {
  stubGlobals();
  const server = setupMockServer(testAppHandlers);
  afterEach(resetKratosFlowMocks);

  it("should render", async () => {
    server.use(
      http.get("*/sessions/whoami", () => HttpResponse.json(unverifiedSession)),
    );

    const router = createTestRouter();
    await router.push("/verify-wall");
    await router.isReady();

    const wrapper = mountTestApp(KratosVerifyWallAsync, {}, { router });
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain("Confirm your email"),
    );
    wrapper.unmount();
  });
});
