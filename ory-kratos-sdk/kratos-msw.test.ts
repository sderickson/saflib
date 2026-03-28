import { describe, expect, it } from "vitest";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { getKratosFrontendApi } from "./kratos-client.ts";
import { kratosFakeHandlers } from "./kratos.fake.ts";
import { mockRegistrationFlow } from "./kratos-mocks.ts";

/**
 * Smoke-test MSW handlers and {@link kratos-mocks} against the real FrontendApi client shape.
 */
describe("kratos MSW fakes", () => {
  setupMockServer(kratosFakeHandlers);

  it("getRegistrationFlow returns the mutable mock registration flow", async () => {
    const res = await getKratosFrontendApi().getRegistrationFlow({
      id: mockRegistrationFlow.id,
    });
    expect(res.data.id).toBe(mockRegistrationFlow.id);
  });
});
