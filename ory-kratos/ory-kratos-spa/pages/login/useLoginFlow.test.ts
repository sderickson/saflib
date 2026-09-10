import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { createRouter, createMemoryHistory } from "vue-router";
import { setClientName } from "@saflib/links";
import {
  getLoginFlowQueryOptions,
  LoginFlowFetched,
} from "@saflib/ory-kratos-sdk";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import {
  kratosFakeHandlers,
  mockLoginFlow,
  resetKratosFlowMocks,
} from "@saflib/ory-kratos-sdk/fakes";
import {
  configureAuthApp,
  type ConfigureAuthAppOptions,
} from "../../configureAuthApp.ts";
import { useLoginFlow } from "./useLoginFlow.ts";

const mockLoginFlowId = "mock-login-flow";

function mountLoginFlow(options: ConfigureAuthAppOptions = {}) {
  let result!: ReturnType<typeof useLoginFlow>;
  const Harness = defineComponent({
    setup() {
      result = useLoginFlow(ref(mockLoginFlow));
      return () => null;
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { template: "<div/>" } }],
  });
  const app = createApp(
    defineComponent({
      setup() {
        configureAuthApp(options);
        return () => h(Harness);
      },
    }),
  );
  app.use(VueQueryPlugin, { queryClient });
  app.use(router);
  app.mount(document.createElement("div"));
  return [result, app, queryClient] as const;
}

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

  it("assigns window.location to account MFA setup after AAL1 login when MFA is required", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://auth.localhost:3000/",
      host: "auth.localhost:3000",
      protocol: "http:",
      assign: assignMock,
    });
    const mfaSetup = "http://account.localhost:3000/mfa";

    try {
      const [loginFlow, app] = mountLoginFlow({
        requireMfaAfterLogin: true,
      });

      await loginFlow.submitLoginForm(loginTestForm());

      await vi.waitFor(() =>
        expect(assignMock).toHaveBeenCalledWith(mfaSetup),
      );
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("assigns window.location to return_to after login when session is already aal2", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://auth.localhost:3000/",
      host: "auth.localhost:3000",
      protocol: "http:",
      assign: assignMock,
    });
    const hubAppHome = "http://app.localhost:3000/";

    server.use(
      http.post("*/self-service/login", () =>
        HttpResponse.json({
          session: {
            id: "mock-session-aal2",
            active: true,
            authenticator_assurance_level: "aal2",
          },
        }),
      ),
    );

    try {
      const [loginFlow, app] = mountLoginFlow({
        requireMfaAfterLogin: true,
      });

      await loginFlow.submitLoginForm(loginTestForm());

      await vi.waitFor(() =>
        expect(assignMock).toHaveBeenCalledWith(hubAppHome),
      );
      app.unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("assigns window.location to return_to after AAL1 login when MFA is not required", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("location", {
      href: "http://auth.localhost:3000/",
      host: "auth.localhost:3000",
      protocol: "http:",
      assign: assignMock,
    });
    const hubAppHome = "http://app.localhost:3000/";

    try {
      const [loginFlow, app] = mountLoginFlow({
        requireMfaAfterLogin: false,
      });

      await loginFlow.submitLoginForm(loginTestForm());

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

    const [loginFlow, app, queryClient] = mountLoginFlow();

    queryClient.setQueryData(
      getLoginFlowQueryOptions({ flowId: mockLoginFlowId }).queryKey,
      new LoginFlowFetched(mockLoginFlow),
    );

    await loginFlow.submitLoginForm(loginTestForm());

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
