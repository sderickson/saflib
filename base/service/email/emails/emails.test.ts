import { describe, expect, it } from "vitest";
import { passwordReset } from "./password-reset.ts";
import { verifyEmail } from "./verify-email.ts";

describe("verifyEmail", () => {
  it("includes the verification code and optional link", () => {
    const { subject, html } = verifyEmail({
      verificationCode: "123456",
      verificationUrl: "http://account.docker.localhost/verification?flow=abc",
      expiresInMinutes: 15,
    });

    expect(subject).toBe("Verify your email address");
    expect(html).toContain("123456");
    expect(html).toContain("Verify email");
    expect(html).toContain("expires in 15 minutes");
  });
});

describe("passwordReset", () => {
  it("includes the recovery code", () => {
    const { subject, html } = passwordReset({
      recoveryCode: "654321",
      expiresInMinutes: 15,
    });

    expect(subject).toBe("Reset your password");
    expect(html).toContain("654321");
    expect(html).toContain("expires in 15 minutes");
  });
});
