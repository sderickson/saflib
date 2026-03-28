import { AxiosError } from "axios";
import { TanstackError } from "@saflib/sdk";
import { withVueQuery } from "@saflib/sdk/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRedirectRequired } from "../flow-results.ts";
import { getLoginFlowQueryKey, LoginFlowFetched } from "../queries/get-login-flow.ts";
import {
  getRecoveryFlowQueryKey,
  RecoveryFlowFetched,
} from "../queries/get-recovery-flow.ts";
import {
  getRegistrationFlowQueryKey,
  RegistrationFlowFetched,
} from "../queries/get-registration-flow.ts";
import {
  getSettingsFlowQueryKey,
  SettingsFlowFetched,
} from "../queries/get-settings-flow.ts";
import {
  getVerificationFlowQueryKey,
  VerificationFlowFetched,
} from "../queries/get-verification-flow.ts";
import {
  LoginCompleted,
  LoginFlowUpdated,
  useUpdateLoginFlowMutation,
} from "./update-login-flow.ts";
import {
  RegistrationCompleted,
  RegistrationFlowUpdated,
  useUpdateRegistrationFlowMutation,
} from "./update-registration-flow.ts";
import { RecoveryFlowUpdated, useUpdateRecoveryFlowMutation } from "./update-recovery-flow.ts";
import {
  SettingsFlowUpdated,
  useUpdateSettingsFlowMutation,
} from "./update-settings-flow.ts";
import {
  useUpdateVerificationFlowMutation,
  VerificationFlowUpdated,
} from "./update-verification-flow.ts";

const mockApi = vi.hoisted(() => ({
  updateLoginFlow: vi.fn(),
  updateRegistrationFlow: vi.fn(),
  updateRecoveryFlow: vi.fn(),
  updateSettingsFlow: vi.fn(),
  updateVerificationFlow: vi.fn(),
}));

vi.mock("../kratos-client.ts", () => ({
  getKratosFrontendApi: () => mockApi,
}));

const minimalFlow = {
  id: "flow-1",
  ui: { nodes: [], messages: [] },
} as never;

const nativeLogin = {
  session: {
    id: "sess",
    active: true,
    identity: { id: "i", schema_id: "default", traits: {} },
  },
};

describe("useUpdateLoginFlowMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns LoginCompleted on success", async () => {
    mockApi.updateLoginFlow.mockResolvedValue({ data: nativeLogin });
    const [{ mutateAsync }, app] = withVueQuery(() => useUpdateLoginFlowMutation());
    const result = await mutateAsync({
      flow: "flow-1",
      updateLoginFlowBody: {
        method: "password",
        identifier: "a@b.c",
        password: "secret",
      },
    });
    expect(result).toBeInstanceOf(LoginCompleted);
    app.unmount();
  });

  it("returns LoginFlowUpdated and caches flow on error body", async () => {
    const err = new AxiosError("v");
    err.response = { status: 400, data: minimalFlow } as never;
    mockApi.updateLoginFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app, qc] = withVueQuery(() => useUpdateLoginFlowMutation());
    const result = await mutateAsync({
      flow: "flow-1",
      updateLoginFlowBody: { method: "password", identifier: "a", password: "b" },
    });
    expect(result).toBeInstanceOf(LoginFlowUpdated);
    expect(qc.getQueryData(getLoginFlowQueryKey("flow-1"))).toBeInstanceOf(
      LoginFlowFetched,
    );
    app.unmount();
  });

  it("returns BrowserRedirectRequired on 422 with redirect_browser_to", async () => {
    const err = new AxiosError("r");
    err.response = {
      status: 422,
      data: { redirect_browser_to: "https://example/continue" },
    } as never;
    mockApi.updateLoginFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app] = withVueQuery(() => useUpdateLoginFlowMutation());
    const result = await mutateAsync({
      flow: "f",
      updateLoginFlowBody: { method: "password", identifier: "a", password: "b" },
    });
    expect(result).toBeInstanceOf(BrowserRedirectRequired);
    app.unmount();
  });

  it("throws TanstackError when response is not a flow or redirect", async () => {
    const err = new AxiosError("x");
    err.response = { status: 400, data: { no: "flow" } } as never;
    mockApi.updateLoginFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app] = withVueQuery(() => useUpdateLoginFlowMutation());
    await expect(
      mutateAsync({
        flow: "f",
        updateLoginFlowBody: { method: "password", identifier: "a", password: "b" },
      }),
    ).rejects.toBeInstanceOf(TanstackError);
    app.unmount();
  });
});

describe("useUpdateRegistrationFlowMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns RegistrationCompleted on success", async () => {
    mockApi.updateRegistrationFlow.mockResolvedValue({
      data: { identity: { id: "i", schema_id: "s", traits: {} }, session: { id: "s" } },
    });
    const [{ mutateAsync }, app] = withVueQuery(() =>
      useUpdateRegistrationFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "f1",
      updateRegistrationFlowBody: {
        method: "password",
        password: "secret",
        traits: { email: "a@b.c" },
      },
    });
    expect(result).toBeInstanceOf(RegistrationCompleted);
    app.unmount();
  });

  it("returns RegistrationFlowUpdated and caches on validation body", async () => {
    const err = new AxiosError("v");
    err.response = { status: 400, data: minimalFlow } as never;
    mockApi.updateRegistrationFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app, qc] = withVueQuery(() =>
      useUpdateRegistrationFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "flow-1",
      updateRegistrationFlowBody: {
        method: "password",
        password: "x",
        traits: { email: "a@b.c" },
      },
    });
    expect(result).toBeInstanceOf(RegistrationFlowUpdated);
    expect(qc.getQueryData(getRegistrationFlowQueryKey("flow-1"))).toBeInstanceOf(
      RegistrationFlowFetched,
    );
    app.unmount();
  });
});

describe("useUpdateRecoveryFlowMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns RecoveryFlowUpdated on success and caches flow", async () => {
    mockApi.updateRecoveryFlow.mockResolvedValue({ data: minimalFlow });
    const [{ mutateAsync }, app, qc] = withVueQuery(() =>
      useUpdateRecoveryFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "flow-1",
      updateRecoveryFlowBody: { method: "link", email: "a@b.c" },
    });
    expect(result).toBeInstanceOf(RecoveryFlowUpdated);
    expect(qc.getQueryData(getRecoveryFlowQueryKey("flow-1"))).toBeInstanceOf(
      RecoveryFlowFetched,
    );
    app.unmount();
  });

  it("returns BrowserRedirectRequired when error payload is redirect without ui", async () => {
    const err = new AxiosError("r");
    err.response = {
      status: 422,
      data: { redirect_browser_to: "https://x" },
    } as never;
    mockApi.updateRecoveryFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app] = withVueQuery(() => useUpdateRecoveryFlowMutation());
    const result = await mutateAsync({
      flow: "f",
      updateRecoveryFlowBody: { method: "link", email: "a@b.c" },
    });
    expect(result).toBeInstanceOf(BrowserRedirectRequired);
    app.unmount();
  });
});

describe("useUpdateSettingsFlowMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SettingsFlowUpdated and caches", async () => {
    mockApi.updateSettingsFlow.mockResolvedValue({ data: minimalFlow });
    const [{ mutateAsync }, app, qc] = withVueQuery(() =>
      useUpdateSettingsFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "flow-1",
      updateSettingsFlowBody: { method: "profile", traits: { email: "a@b.c" } },
    });
    expect(result).toBeInstanceOf(SettingsFlowUpdated);
    expect(qc.getQueryData(getSettingsFlowQueryKey("flow-1"))).toBeInstanceOf(
      SettingsFlowFetched,
    );
    app.unmount();
  });

  it("returns BrowserRedirectRequired for redirect-only 422 body", async () => {
    const err = new AxiosError("r");
    err.response = {
      status: 422,
      data: { redirect_browser_to: "https://reauth" },
    } as never;
    mockApi.updateSettingsFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app] = withVueQuery(() => useUpdateSettingsFlowMutation());
    const result = await mutateAsync({
      flow: "f",
      updateSettingsFlowBody: { method: "profile", traits: { email: "a@b.c" } },
    });
    expect(result).toBeInstanceOf(BrowserRedirectRequired);
    app.unmount();
  });
});

describe("useUpdateVerificationFlowMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns VerificationFlowUpdated and caches", async () => {
    mockApi.updateVerificationFlow.mockResolvedValue({ data: minimalFlow });
    const [{ mutateAsync }, app, qc] = withVueQuery(() =>
      useUpdateVerificationFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "flow-1",
      updateVerificationFlowBody: { method: "code", csrf_token: "t", code: "123456" },
    });
    expect(result).toBeInstanceOf(VerificationFlowUpdated);
    expect(qc.getQueryData(getVerificationFlowQueryKey("flow-1"))).toBeInstanceOf(
      VerificationFlowFetched,
    );
    app.unmount();
  });

  it("returns VerificationFlowUpdated on validation-shaped error", async () => {
    const err = new AxiosError("v");
    err.response = { status: 400, data: minimalFlow } as never;
    mockApi.updateVerificationFlow.mockRejectedValue(err);
    const [{ mutateAsync }, app] = withVueQuery(() =>
      useUpdateVerificationFlowMutation(),
    );
    const result = await mutateAsync({
      flow: "flow-1",
      updateVerificationFlowBody: { method: "code", csrf_token: "t", code: "000000" },
    });
    expect(result).toBeInstanceOf(VerificationFlowUpdated);
    app.unmount();
  });
});
