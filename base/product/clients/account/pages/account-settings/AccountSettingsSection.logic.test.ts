import { describe, expect, it } from "vitest";
import type { Session } from "@ory/client";
import { sessionHasSecondFactorAuthenticationMethod } from "./AccountSettingsSection.logic.ts";

function sessionWithMethods(
  methods: Session["authentication_methods"],
): Session {
  return { id: "s", authentication_methods: methods } as Session;
}

describe("sessionHasSecondFactorAuthenticationMethod", () => {
  it("is false without a session or methods", () => {
    expect(sessionHasSecondFactorAuthenticationMethod(null)).toBe(false);
    expect(sessionHasSecondFactorAuthenticationMethod(undefined)).toBe(false);
    expect(sessionHasSecondFactorAuthenticationMethod(sessionWithMethods([]))).toBe(
      false,
    );
    expect(
      sessionHasSecondFactorAuthenticationMethod(
        sessionWithMethods([{ method: "password", aal: "aal1" }]),
      ),
    ).toBe(false);
  });

  it("is true when totp appears in authentication_methods", () => {
    expect(
      sessionHasSecondFactorAuthenticationMethod(
        sessionWithMethods([
          { method: "password", aal: "aal1" },
          { method: "totp", aal: "aal2" },
        ]),
      ),
    ).toBe(true);
  });

  it("is true when webauthn appears in authentication_methods", () => {
    expect(
      sessionHasSecondFactorAuthenticationMethod(
        sessionWithMethods([
          { method: "password", aal: "aal1" },
          { method: "webauthn", aal: "aal2" },
        ]),
      ),
    ).toBe(true);
  });
});
