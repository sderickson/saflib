import type { UiText } from "@ory/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { setClientName } from "@saflib/links";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  resetKratosFlowMocks,
  setMockRegistrationPostResult,
} from "@saflib/ory-kratos-sdk/fakes";
import {
  RegistrationFlowFetched,
  getRegistrationFlowQueryOptions,
} from "@saflib/ory-kratos-sdk";
import {
  kratosFakeHandlers,
  mockRegistrationFlow,
} from "@saflib/ory-kratos-sdk/fakes";
import { useRegistrationFlow } from "./useRegistrationFlow.ts";

function registrationTestForm() {
  const form = document.createElement("form");
  for (const [name, value] of [
    ["csrf_token", "csrf"],
    ["traits.email", "register@test.dev"],
    ["password", "long-safe-pass"],
  ] as const) {
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}

describe("useRegistrationFlow", () => {
  setupMockServer(kratosFakeHandlers);

  beforeEach(() => {
    setClientName("auth");
  });

  afterEach(() => {
    resetKratosFlowMocks();
    vi.restoreAllMocks();
  });

  it("falls back to app home when the flow has no return_to", async () => {
    setMockRegistrationPostResult("success");
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    try {
      const flowRef = ref({ ...mockRegistrationFlow });
      const [{ submitRegistrationForm }, app] = withVueQuery(() =>
        useRegistrationFlow(flowRef),
      );

      await submitRegistrationForm(registrationTestForm());

      const expected = "http://app.localhost:3000/";
      await vi.waitFor(() => expect(assignMock).toHaveBeenCalledWith(expected));
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("updates cached registration flow from a 400 response body", async () => {
    setMockRegistrationPostResult("validation_error");

    const flowRef = ref({ ...mockRegistrationFlow });
    const [{ submitRegistrationForm }, app, queryClient] = withVueQuery(() =>
      useRegistrationFlow(flowRef),
    );

    await submitRegistrationForm(registrationTestForm());

    const key = getRegistrationFlowQueryOptions({
      flowId: mockRegistrationFlow.id,
    }).queryKey;
    const data = queryClient.getQueryData(key);
    expect(data).toBeInstanceOf(RegistrationFlowFetched);
    expect(
      (data as RegistrationFlowFetched).flow.ui.messages?.some((m: UiText) =>
        String(m.text).includes("Validation failed"),
      ),
    ).toBe(true);
    app.unmount();
  });
});
