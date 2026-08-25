import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  TanstackError,
  AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED,
  AUTH_ERROR_MFA_REQUIRED,
} from "@saflib/sdk";
import {
  baseVerifyEmailHref,
  isEmailVerificationRequiredError,
  resolveBaseAccessErrorKind,
} from "./access-error.logic.ts";

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
});
