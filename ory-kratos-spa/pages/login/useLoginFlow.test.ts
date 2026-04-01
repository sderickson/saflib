import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { setClientName } from "@saflib/links";
import {
  getLoginFlowQueryOptions,
  LoginFlowFetched,
} from "@saflib/ory-kratos-sdk";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  kratosFakeHandlers,
  mockLoginFlow,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import { useLoginFlow } from "./useLoginFlow.ts";

const mockLoginFlowId = "mock-login-flow";

function loginTestForm() {
  const form = document.createElement("form");
  for (const [name, value] of [
    ["csrf_token", "mock-login-csrf"],
    ["identifier", "register@test.dev"],
    ["password", "long-safe-pass"],
  ] as const) {
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}

describe("useLoginFlow", () => {
  const server = setupMockServer(kratosFakeHandlers);

  beforeEach(() => {
    setClientName("auth");
  });

  afterEach(() => {
    resetKratosFlowMocks();
    vi.restoreAllMocks();
  });

  it("assigns window.location to hub app home after successful login when flow has no return_to", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    const hubAppHome = "/";

    try {
      const [{ submitLoginForm }, app] = withVueQuery(() =>
        useLoginFlow(ref(mockLoginFlow)),
      );

      await submitLoginForm(loginTestForm());

      await vi.waitFor(() =>
        expect(assignMock).toHaveBeenCalledWith(hubAppHome),
      );
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("writes updated login flow to TanStack cache from a 400 response body", async () => {
    server.use(
      http.post("*/self-service/login", () =>
        HttpResponse.json(
          {
            ...mockLoginFlow,
            ui: {
              ...mockLoginFlow.ui,
              messages: [
                ...(mockLoginFlow.ui.messages ?? []),
                {
                  type: "error" as const,
                  text: "Login validation failed (fake)",
                },
              ],
            },
          },
          { status: 400 },
        ),
      ),
    );

    const [{ submitLoginForm }, app, queryClient] = withVueQuery(() =>
      useLoginFlow(ref(mockLoginFlow)),
    );

    queryClient.setQueryData(
      getLoginFlowQueryOptions({ flowId: mockLoginFlowId }).queryKey,
      new LoginFlowFetched(mockLoginFlow),
    );

    await submitLoginForm(loginTestForm());

    await vi.waitFor(() => {
      const data = queryClient.getQueryData(
        getLoginFlowQueryOptions({ flowId: mockLoginFlowId }).queryKey,
      );
      expect(data).toBeInstanceOf(LoginFlowFetched);
      if (data instanceof LoginFlowFetched) {
        expect(
          data.flow.ui.messages?.some((m) =>
            String(m.text).includes("Login validation failed"),
          ),
        ).toBe(true);
      }
    });
    app.unmount();
  });
});
