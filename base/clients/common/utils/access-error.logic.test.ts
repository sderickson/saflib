import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  TanstackError,
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk";
import {
  baseVerifyEmailHref,
  baseMfaSetupHref,
  isEmailVerificationRequiredError,
  probeBaseMfaRequirement,
  resolveBaseAccessErrorKind,
} from "./access-error.logic.ts";
import {
  LoginFlowCreated,
  createLoginFlowQueryOptions,
} from "@saflib/ory-kratos-sdk";

describe("access-error.logic", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        href: "http://app.docker.localhost/home",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects email verification required errors", () => {
    const error = new TanstackError(
      403,
      AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
    );

    expect(isEmailVerificationRequiredError(error)).toBe(true);
    expect(resolveBaseAccessErrorKind(error)).toBe("email");
  });

  it("maps other auth errors", () => {
    expect(resolveBaseAccessErrorKind(new TanstackError(401))).toBe("login");
    expect(
      resolveBaseAccessErrorKind(new TanstackError(403, AUTH_ERROR_MFA_REQUIRED)),
    ).toBe("mfa");
  });

  it("builds verify-email href with return_to", () => {
    const href = baseVerifyEmailHref("http://app.docker.localhost/home");
    expect(href).toContain("/verify-email");
    expect(href).toContain(
      "return_to=http%3A%2F%2Fapp.docker.localhost%2Fhome",
    );
  });

  it("builds mfa setup href with return_to", () => {
    const href = baseMfaSetupHref("http://admin.docker.localhost/cron");
    expect(href).toContain("/mfa");
    expect(href).toContain(
      "return_to=http%3A%2F%2Fadmin.docker.localhost%2Fcron",
    );
  });

  it("probes MFA setup vs step-up from AAL2 login flow", async () => {
    const setupFlow = {
      id: "flow-setup",
      ui: { nodes: [{ type: "input", attributes: { node_type: "input", type: "hidden" } }] },
    };
    const stepUpFlow = {
      id: "flow-step",
      ui: {
        nodes: [
          { type: "input", attributes: { node_type: "input", type: "text", name: "totp_code" } },
        ],
      },
    };

    const setupClient = {
      fetchQuery: vi.fn(async () => new LoginFlowCreated(setupFlow as any)),
    };
    const stepUpClient = {
      fetchQuery: vi.fn(async () => new LoginFlowCreated(stepUpFlow as any)),
    };

    await expect(probeBaseMfaRequirement(setupClient as any)).resolves.toEqual({
      kind: "setup",
      href: baseMfaSetupHref("http://app.docker.localhost/home"),
    });
    await expect(probeBaseMfaRequirement(stepUpClient as any)).resolves.toMatchObject({
      kind: "step_up",
    });
    expect(setupClient.fetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: createLoginFlowQueryOptions({
          returnTo: "http://app.docker.localhost/home",
          aal: "aal2",
        }).queryKey,
      }),
    );
  });
});
