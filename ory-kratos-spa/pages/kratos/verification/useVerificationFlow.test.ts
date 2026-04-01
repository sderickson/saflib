import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setClientName } from "@saflib/links";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  kratosFakeHandlers,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import { useVerificationFlow } from "./useVerificationFlow.ts";

const mockVerificationFlowId = "mock-verification-flow";

function verificationTestForm() {
  const form = document.createElement("form");
  for (const [name, value] of [
    ["csrf_token", "mock-verification-csrf"],
    ["code", "123456"],
  ] as const) {
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}

describe("useVerificationFlow", () => {
  setupMockServer(kratosFakeHandlers);

  beforeEach(() => {
    setClientName("auth");
  });

  afterEach(() => {
    resetKratosFlowMocks();
    vi.restoreAllMocks();
  });

  it("assigns window.location after successful submit using flow return_to or app home fallback", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    try {
      const [{ submitVerificationForm }, app] = withVueQuery(() =>
        useVerificationFlow(
          () => undefined,
          () => mockVerificationFlowId,
        ),
      );

      await submitVerificationForm(verificationTestForm());

      await vi.waitFor(() => expect(assignMock).toHaveBeenCalledWith("/"));
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
