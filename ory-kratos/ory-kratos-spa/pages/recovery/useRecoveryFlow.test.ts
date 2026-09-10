import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setClientName } from "@saflib/links";
import {
  getRecoveryFlowQueryOptions,
  RecoveryFlowFetched,
} from "@saflib/ory-kratos-sdk";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  kratosFakeHandlers,
  mockRecoveryFlow,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import { useRecoveryFlow } from "./useRecoveryFlow.ts";

const mockRecoveryFlowId = "mock-recovery-flow";

function recoveryLinkMethodForm() {
  const form = document.createElement("form");
  for (const [name, value] of [
    ["csrf_token", "mock-recovery-csrf"],
    ["email", "user@example.com"],
    ["method", "link"],
  ] as const) {
    const input = document.createElement("input");
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}

describe("useRecoveryFlow", () => {
  const server = setupMockServer(kratosFakeHandlers);

  beforeEach(() => {
    setClientName("auth");
  });

  afterEach(() => {
    resetKratosFlowMocks();
    vi.restoreAllMocks();
  });

  it("assigns window.location for 422 ErrorBrowserLocationChangeRequired (redirect only, no flow ui)", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    const nextUrl = "https://settings.example/after-recovery";

    server.use(
      http.post("*/self-service/recovery", () =>
        HttpResponse.json({ redirect_browser_to: nextUrl }, { status: 422 }),
      ),
    );

    try {
      const [{ submitRecoveryForm }, app] = withVueQuery(() =>
        useRecoveryFlow(
          () => undefined,
          () => mockRecoveryFlowId,
        ),
      );

      await submitRecoveryForm(recoveryLinkMethodForm());

      await vi.waitFor(() => expect(assignMock).toHaveBeenCalledWith(nextUrl));
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("assigns window.location when 422 body is a full recovery flow with continue_with", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    const nextUrl = "https://settings.example/complete";

    server.use(
      http.post("*/self-service/recovery", () =>
        HttpResponse.json(
          {
            ...mockRecoveryFlow,
            continue_with: [
              {
                action: "redirect_browser_to",
                redirect_browser_to: nextUrl,
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );

    try {
      const [{ submitRecoveryForm }, app] = withVueQuery(() =>
        useRecoveryFlow(
          () => undefined,
          () => mockRecoveryFlowId,
        ),
      );

      await submitRecoveryForm(recoveryLinkMethodForm());

      await vi.waitFor(() => expect(assignMock).toHaveBeenCalledWith(nextUrl));
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("assigns window.location when the update response includes redirect_browser_to", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://localhost/",
      assign: assignMock,
    });
    const nextUrl = "https://settings.example/complete";

    server.use(
      http.post("*/self-service/recovery", () =>
        HttpResponse.json({
          ...mockRecoveryFlow,
          continue_with: [
            {
              action: "redirect_browser_to",
              redirect_browser_to: nextUrl,
            },
          ],
        }),
      ),
    );

    try {
      const [{ submitRecoveryForm }, app] = withVueQuery(() =>
        useRecoveryFlow(
          () => undefined,
          () => mockRecoveryFlowId,
        ),
      );

      await submitRecoveryForm(recoveryLinkMethodForm());

      await vi.waitFor(() => expect(assignMock).toHaveBeenCalledWith(nextUrl));
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("updates cached recovery flow from a 400 response body", async () => {
    server.use(
      http.post("*/self-service/recovery", () =>
        HttpResponse.json(
          {
            ...mockRecoveryFlow,
            ui: {
              ...mockRecoveryFlow.ui,
              messages: [
                ...(mockRecoveryFlow.ui.messages ?? []),
                {
                  type: "error" as const,
                  text: "Recovery validation failed (fake)",
                },
              ],
            },
          },
          { status: 400 },
        ),
      ),
    );

    const [{ submitRecoveryForm }, app, queryClient] = withVueQuery(() =>
      useRecoveryFlow(
        () => undefined,
        () => mockRecoveryFlowId,
      ),
    );

    queryClient.setQueryData(
      getRecoveryFlowQueryOptions({ flowId: mockRecoveryFlowId }).queryKey,
      new RecoveryFlowFetched(mockRecoveryFlow),
    );

    await submitRecoveryForm(recoveryLinkMethodForm());

    await vi.waitFor(() => {
      const data = queryClient.getQueryData(
        getRecoveryFlowQueryOptions({ flowId: mockRecoveryFlowId }).queryKey,
      );
      expect(data).toBeInstanceOf(RecoveryFlowFetched);
      if (data instanceof RecoveryFlowFetched) {
        expect(
          data.flow.ui.messages?.some((m) =>
            String(m.text).includes("Recovery validation failed"),
          ),
        ).toBe(true);
      }
    });
    app.unmount();
  });
});
