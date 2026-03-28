import { QueryClient } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import type { GenericError } from "@ory/client";
import { TanstackError } from "@saflib/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FlowGone,
  SecurityCsrfViolation,
  SessionAlreadyAvailable,
  UnhandledResponse,
} from "../flow-results.ts";
import {
  BrowserLogoutFlowCreated,
  createBrowserLogoutFlowQueryOptions,
} from "./create-browser-logout-flow.ts";
import { createLoginFlowQueryOptions, LoginFlowCreated } from "./create-login-flow.ts";
import { createRecoveryFlowQueryOptions } from "./create-recovery-flow.ts";
import {
  createRegistrationFlowQueryOptions,
  RegistrationFlowCreated,
} from "./create-registration-flow.ts";
import { getLoginFlowQueryOptions, LoginFlowFetched } from "./get-login-flow.ts";
import { getRecoveryFlowQueryOptions, RecoveryFlowFetched } from "./get-recovery-flow.ts";
import { getRegistrationFlowQueryOptions } from "./get-registration-flow.ts";
import { getSettingsFlowQueryOptions, SettingsFlowFetched } from "./get-settings-flow.ts";
import {
  createSettingsFlowQueryOptions,
  SettingsFlowCreated,
} from "./create-settings-flow.ts";
import {
  createVerificationFlowQueryOptions,
  VerificationFlowCreated,
} from "./create-verification-flow.ts";
import { getVerificationFlowQueryOptions, VerificationFlowFetched } from "./get-verification-flow.ts";

const mockApi = vi.hoisted(() => ({
  createBrowserLoginFlow: vi.fn(),
  createBrowserLogoutFlow: vi.fn(),
  createBrowserRecoveryFlow: vi.fn(),
  createBrowserRegistrationFlow: vi.fn(),
  createBrowserSettingsFlow: vi.fn(),
  createBrowserVerificationFlow: vi.fn(),
  getLoginFlow: vi.fn(),
  getRecoveryFlow: vi.fn(),
  getRegistrationFlow: vi.fn(),
  getSettingsFlow: vi.fn(),
  getVerificationFlow: vi.fn(),
}));

vi.mock("../kratos-client.ts", () => ({
  getKratosFrontendApi: () => mockApi,
}));

const minimalFlow = {
  id: "flow-1",
  ui: { nodes: [], messages: [] },
} as never;

describe("createLoginFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns LoginFlowCreated on success", async () => {
    mockApi.createBrowserLoginFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createLoginFlowQueryOptions({ returnTo: "http://app/" }));
    expect(r).toBeInstanceOf(LoginFlowCreated);
    expect((r as LoginFlowCreated).flow).toEqual(minimalFlow);
    expect(mockApi.createBrowserLoginFlow).toHaveBeenCalledWith({
      returnTo: "http://app/",
    });
  });

  it("returns SessionAlreadyAvailable on 400 session_already_available", async () => {
    const err = new AxiosError("bad");
    err.response = {
      status: 400,
      data: { error: { id: "session_already_available" } as GenericError },
    } as never;
    mockApi.createBrowserLoginFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createLoginFlowQueryOptions({}));
    expect(r).toBeInstanceOf(SessionAlreadyAvailable);
  });

  it("returns UnhandledResponse on other 4xx", async () => {
    const err = new AxiosError("bad");
    err.response = { status: 404, data: { x: 1 } } as never;
    mockApi.createBrowserLoginFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createLoginFlowQueryOptions({}));
    expect(r).toBeInstanceOf(UnhandledResponse);
    expect((r as UnhandledResponse).status).toBe(404);
  });

  it("throws TanstackError on 5xx", async () => {
    const err = new AxiosError("bad");
    err.response = { status: 503, data: {} } as never;
    mockApi.createBrowserLoginFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await expect(qc.fetchQuery(createLoginFlowQueryOptions({}))).rejects.toBeInstanceOf(
      TanstackError,
    );
  });
});

describe("getLoginFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns LoginFlowFetched on success", async () => {
    mockApi.getLoginFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(
      getLoginFlowQueryOptions({ flowId: "flow-1" }),
    );
    expect(r).toBeInstanceOf(LoginFlowFetched);
    expect(mockApi.getLoginFlow).toHaveBeenCalledWith({ id: "flow-1" });
  });

  it("returns FlowGone on 410", async () => {
    const err = new AxiosError("gone");
    err.response = { status: 410, data: {} } as never;
    mockApi.getLoginFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(getLoginFlowQueryOptions({ flowId: "x" }));
    expect(r).toBeInstanceOf(FlowGone);
  });

  it("returns SecurityCsrfViolation on 403 CSRF", async () => {
    const body = { error: { id: "security_csrf_violation" } };
    const err = new AxiosError("csrf");
    err.response = { status: 403, data: body } as never;
    mockApi.getLoginFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(getLoginFlowQueryOptions({ flowId: "x" }));
    expect(r).toBeInstanceOf(SecurityCsrfViolation);
  });
});

describe("createBrowserLogoutFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns BrowserLogoutFlowCreated on success", async () => {
    mockApi.createBrowserLogoutFlow.mockResolvedValue({
      data: { logout_token: "t", logout_url: "http://x" },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(
      createBrowserLogoutFlowQueryOptions({ returnTo: "http://after" }),
    );
    expect(r).toBeInstanceOf(BrowserLogoutFlowCreated);
    expect(mockApi.createBrowserLogoutFlow).toHaveBeenCalledWith({
      returnTo: "http://after",
    });
  });
});

describe("createRecoveryFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps session_already_available like login create", async () => {
    const err = new AxiosError("bad");
    err.response = {
      status: 400,
      data: { error: { id: "session_already_available" } as GenericError },
    } as never;
    mockApi.createBrowserRecoveryFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createRecoveryFlowQueryOptions({}));
    expect(r).toBeInstanceOf(SessionAlreadyAvailable);
  });
});

describe("createRegistrationFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns RegistrationFlowCreated on success", async () => {
    mockApi.createBrowserRegistrationFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(
      createRegistrationFlowQueryOptions({ returnTo: "http://x" }),
    );
    expect(r).toBeInstanceOf(RegistrationFlowCreated);
  });
});

describe("getRecoveryFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches recovery flow", async () => {
    mockApi.getRecoveryFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(getRecoveryFlowQueryOptions({ flowId: "rec1" }));
    expect(r).toBeInstanceOf(RecoveryFlowFetched);
  });
});

describe("getRegistrationFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses same GET error mapping as login", async () => {
    const err = new AxiosError("gone");
    err.response = { status: 410, data: {} } as never;
    mockApi.getRegistrationFlow.mockRejectedValue(err);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(
      getRegistrationFlowQueryOptions({ flowId: "r1" }),
    );
    expect(r).toBeInstanceOf(FlowGone);
  });
});

describe("getSettingsFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches settings flow", async () => {
    mockApi.getSettingsFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(getSettingsFlowQueryOptions({ flowId: "s1" }));
    expect(r).toBeInstanceOf(SettingsFlowFetched);
  });
});

describe("getVerificationFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches verification flow", async () => {
    mockApi.getVerificationFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(
      getVerificationFlowQueryOptions({ flowId: "v1" }),
    );
    expect(r).toBeInstanceOf(VerificationFlowFetched);
  });
});

describe("createSettingsFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SettingsFlowCreated on success", async () => {
    mockApi.createBrowserSettingsFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createSettingsFlowQueryOptions({}));
    expect(r).toBeInstanceOf(SettingsFlowCreated);
  });
});

describe("createVerificationFlowQueryOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns VerificationFlowCreated on success", async () => {
    mockApi.createBrowserVerificationFlow.mockResolvedValue({ data: minimalFlow });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const r = await qc.fetchQuery(createVerificationFlowQueryOptions({}));
    expect(r).toBeInstanceOf(VerificationFlowCreated);
  });
});
