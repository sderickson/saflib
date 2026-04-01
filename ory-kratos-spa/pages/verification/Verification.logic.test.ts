import { VerificationFlowState } from "@ory/client";
import { describe, expect, it } from "vitest";
import {
  buildVerificationUpdateBodyFromFormData,
  buildVerificationResendCodeBody,
  destinationAfterVerification,
  emailForVerificationResend,
  verificationFlowIsComplete,
  verificationFlowShouldFetch,
} from "./Verification.logic.ts";

describe("verificationFlowShouldFetch", () => {
  it("returns true when the route has a non-empty flow id", () => {
    expect(verificationFlowShouldFetch("flow-1")).toBe(true);
    expect(verificationFlowShouldFetch("  x  ")).toBe(true);
  });

  it("returns false when there is no flow id or it is blank", () => {
    expect(verificationFlowShouldFetch(undefined)).toBe(false);
    expect(verificationFlowShouldFetch("")).toBe(false);
    expect(verificationFlowShouldFetch("   ")).toBe(false);
  });
});

describe("verificationFlowIsComplete", () => {
  it("returns true when state is passed_challenge", () => {
    expect(
      verificationFlowIsComplete({ state: VerificationFlowState.PassedChallenge } as never),
    ).toBe(true);
  });

  it("returns false for other states", () => {
    expect(
      verificationFlowIsComplete({ state: VerificationFlowState.SentEmail } as never),
    ).toBe(false);
  });
});

describe("destinationAfterVerification", () => {
  it("prefers the flow return_to when set", () => {
    expect(destinationAfterVerification("https://app.example/after", "https://fallback")).toBe(
      "https://app.example/after",
    );
  });

  it("uses the fallback when return_to is empty", () => {
    expect(destinationAfterVerification("  ", "https://fallback")).toBe("https://fallback");
    expect(destinationAfterVerification(undefined, "https://fallback")).toBe("https://fallback");
  });
});

describe("buildVerificationUpdateBodyFromFormData", () => {
  it("sends trimmed code only when the user entered a code", () => {
    const fd = new FormData();
    fd.set("csrf_token", "csrf");
    fd.set("email", "a@b.co");
    fd.set("code", " 123456 ");
    expect(buildVerificationUpdateBodyFromFormData(fd)).toEqual({
      method: "code",
      csrf_token: "csrf",
      code: "123456",
    });
  });

  it("sends email when there is no code (request or confirm email step)", () => {
    const fd = new FormData();
    fd.set("csrf_token", "csrf");
    fd.set("email", "  user@example.com ");
    expect(buildVerificationUpdateBodyFromFormData(fd)).toEqual({
      method: "code",
      csrf_token: "csrf",
      email: "user@example.com",
    });
  });
});

describe("emailForVerificationResend", () => {
  it("prefers session identity traits email", () => {
    expect(
      emailForVerificationResend(
        { identity: { traits: { email: "  s@x.com  " } } } as never,
        null,
      ),
    ).toBe("s@x.com");
  });

  it("falls back to an email field on the flow when there is no session email", () => {
    expect(
      emailForVerificationResend(null, {
        ui: {
          nodes: [
            {
              type: "input",
              attributes: {
                node_type: "input",
                name: "email",
                value: "flow@example.com",
              },
            },
          ],
        },
      } as never),
    ).toBe("flow@example.com");
  });
});

describe("buildVerificationResendCodeBody", () => {
  it("sends method code with csrf and email only", () => {
    expect(
      buildVerificationResendCodeBody(
        {
          ui: {
            nodes: [
              {
                type: "input",
                attributes: {
                  node_type: "input",
                  name: "csrf_token",
                  value: "tok",
                },
              },
            ],
          },
        } as never,
        " user@x.com ",
      ),
    ).toEqual({
      method: "code",
      csrf_token: "tok",
      email: "user@x.com",
    });
  });
});
