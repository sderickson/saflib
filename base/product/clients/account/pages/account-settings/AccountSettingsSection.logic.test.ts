import { describe, expect, it } from "vitest";
import type { Session } from "@ory/client";
import { sessionHasTotpAuthenticationMethod } from "./AccountSettingsSection.logic.ts";

function sessionWithMethods(
  methods: Session["authentication_methods"],
): Session {
  return { id: "s", authentication_methods: methods } as Session;
}

describe("sessionHasTotpAuthenticationMethod", () => {
  it("is false without a session or methods", () => {
    expect(sessionHasTotpAuthenticationMethod(null)).toBe(false);
    expect(sessionHasTotpAuthenticationMethod(undefined)).toBe(false);
    expect(sessionHasTotpAuthenticationMethod(sessionWithMethods([]))).toBe(
      false,
    );
    expect(
      sessionHasTotpAuthenticationMethod(
        sessionWithMethods([{ method: "password", aal: "aal1" }]),
      ),
    ).toBe(false);
  });

  it("is true when totp appears in authentication_methods", () => {
    expect(
      sessionHasTotpAuthenticationMethod(
        sessionWithMethods([
          { method: "password", aal: "aal1" },
          { method: "totp", aal: "aal2" },
        ]),
      ),
    ).toBe(true);
  });
});
