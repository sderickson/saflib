import { RecoveryFlowState } from "@ory/client";
import { http, HttpResponse } from "msw";
import {
  getMockRegistrationPostResult,
  mockLoginFlow,
  mockRecoveryFlow,
  mockRegistrationFlow,
  mockSettingsFlow,
  mockVerificationFlow,
} from "./kratos-mocks.ts";

export const kratosToSessionHandler = http.get("*/sessions/whoami", () =>
  HttpResponse.json(null, { status: 401 }),
);

/** Override in tests so session-required loaders succeed (same URL as {@link kratosToSessionHandler}). */
export const kratosSessionLoggedInHandler = http.get(
  "*/sessions/whoami",
  () =>
    HttpResponse.json({
      id: "test-session",
      active: true,
      identity: {
        id: "1",
        schema_id: "default",
        schema_url: "",
        traits: { email: "john.doe@example.com" },
      },
    }),
);

export const kratosRegistrationBrowserHandler = http.get(
  "*/self-service/registration/browser",
  ({ request }) => {
    const returnTo = new URL(request.url).searchParams.get("return_to") ?? undefined;
    return HttpResponse.json({
      ...mockRegistrationFlow,
      return_to: returnTo ?? mockRegistrationFlow.return_to,
    });
  },
);

export const kratosRegistrationFlowByIdHandler = http.get(
  "*/self-service/registration/flows",
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("flow");
    if (id && id === mockRegistrationFlow.id) {
      return HttpResponse.json(mockRegistrationFlow);
    }
    return new HttpResponse(null, { status: 404 });
  },
);

export const kratosUpdateRegistrationHandler = http.post(
  "*/self-service/registration",
  async () => {
    if (getMockRegistrationPostResult() === "success") {
      return HttpResponse.json({
        identity: {
          id: "mock-identity",
          schema_id: "default",
          schema_url: "",
          traits: { email: "user@example.com" },
        },
        session: { id: "mock-session", active: true },
      });
    }
    const body = {
      ...mockRegistrationFlow,
      ui: {
        ...mockRegistrationFlow.ui,
        messages: [
          ...(mockRegistrationFlow.ui.messages ?? []),
          { type: "error" as const, text: "Validation failed (fake)" },
        ],
      },
    };
    return HttpResponse.json(body, { status: 400 });
  },
);

export const kratosBrowserLogoutHandler = http.get(
  "*/self-service/logout/browser",
  () =>
    HttpResponse.json({
      logout_token: "mock-logout-token",
      logout_url: "http://kratos.localhost/self-service/logout?token=mock",
    }),
);

export const kratosLoginBrowserHandler = http.get(
  "*/self-service/login/browser",
  ({ request }) => {
    const returnTo = new URL(request.url).searchParams.get("return_to") ?? undefined;
    return HttpResponse.json({
      ...mockLoginFlow,
      return_to: returnTo ?? mockLoginFlow.return_to,
    });
  },
);

export const kratosLoginFlowByIdHandler = http.get(
  "*/self-service/login/flows",
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("flow");
    if (id && id === mockLoginFlow.id) {
      return HttpResponse.json(mockLoginFlow);
    }
    return new HttpResponse(null, { status: 404 });
  },
);

export const kratosUpdateLoginHandler = http.post("*/self-service/login", () =>
  HttpResponse.json({
    session: { id: "mock-session-after-login", active: true },
    identity: {
      id: "mock-identity",
      schema_id: "default",
      traits: { email: "register@test.dev" },
    },
  }),
);

export const kratosVerificationBrowserHandler = http.get(
  "*/self-service/verification/browser",
  ({ request }) => {
    const returnTo = new URL(request.url).searchParams.get("return_to") ?? undefined;
    return HttpResponse.json({
      ...mockVerificationFlow,
      return_to: returnTo ?? mockVerificationFlow.return_to,
    });
  },
);

export const kratosVerificationFlowByIdHandler = http.get(
  "*/self-service/verification/flows",
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("flow");
    if (id && id === mockVerificationFlow.id) {
      return HttpResponse.json(mockVerificationFlow);
    }
    return new HttpResponse(null, { status: 404 });
  },
);

export const kratosRecoveryBrowserHandler = http.get(
  "*/self-service/recovery/browser",
  ({ request }) => {
    const returnTo = new URL(request.url).searchParams.get("return_to") ?? undefined;
    return HttpResponse.json({
      ...mockRecoveryFlow,
      return_to: returnTo ?? mockRecoveryFlow.return_to,
    });
  },
);

export const kratosRecoveryFlowByIdHandler = http.get(
  "*/self-service/recovery/flows",
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("flow");
    if (id && id === mockRecoveryFlow.id) {
      return HttpResponse.json(mockRecoveryFlow);
    }
    return new HttpResponse(null, { status: 404 });
  },
);

export const kratosUpdateRecoveryHandler = http.post("*/self-service/recovery", async () =>
  HttpResponse.json({
    ...mockRecoveryFlow,
    state: RecoveryFlowState.SentEmail,
    ui: {
      ...mockRecoveryFlow.ui,
      messages: [{ type: "info" as const, text: "Recovery email sent (fake)." }],
    },
  }),
);

export const kratosSettingsBrowserHandler = http.get(
  "*/self-service/settings/browser",
  ({ request }) => {
    const returnTo = new URL(request.url).searchParams.get("return_to") ?? undefined;
    return HttpResponse.json({
      ...mockSettingsFlow,
      return_to: returnTo ?? mockSettingsFlow.return_to,
    });
  },
);

export const kratosSettingsFlowByIdHandler = http.get(
  "*/self-service/settings/flows",
  ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? url.searchParams.get("flow");
    if (id && id === mockSettingsFlow.id) {
      return HttpResponse.json(mockSettingsFlow);
    }
    return new HttpResponse(null, { status: 404 });
  },
);

export const kratosUpdateSettingsHandler = http.post("*/self-service/settings", async () =>
  HttpResponse.json({
    ...mockSettingsFlow,
    ui: {
      ...mockSettingsFlow.ui,
      messages: [{ type: "info" as const, text: "Settings updated (fake)." }],
    },
  }),
);

export const kratosUpdateVerificationHandler = http.post(
  "*/self-service/verification",
  async ({ request }) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      /* non-JSON body */
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (email && !code) {
      return HttpResponse.json({
        ...mockVerificationFlow,
        state: "sent_email",
        ui: {
          ...mockVerificationFlow.ui,
          messages: [
            { type: "info" as const, text: "A new verification code was sent." },
          ],
        },
      });
    }
    return HttpResponse.json({
      ...mockVerificationFlow,
      state: "passed_challenge",
    });
  },
);

export const kratosFakeHandlers = [
  kratosToSessionHandler,
  kratosRegistrationBrowserHandler,
  kratosRegistrationFlowByIdHandler,
  kratosUpdateRegistrationHandler,
  kratosLoginBrowserHandler,
  kratosLoginFlowByIdHandler,
  kratosUpdateLoginHandler,
  kratosVerificationBrowserHandler,
  kratosVerificationFlowByIdHandler,
  kratosUpdateVerificationHandler,
  kratosRecoveryBrowserHandler,
  kratosRecoveryFlowByIdHandler,
  kratosUpdateRecoveryHandler,
  kratosSettingsBrowserHandler,
  kratosSettingsFlowByIdHandler,
  kratosUpdateSettingsHandler,
  kratosBrowserLogoutHandler,
];
