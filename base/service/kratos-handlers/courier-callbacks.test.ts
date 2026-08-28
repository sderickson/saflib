import { afterEach, describe, expect, it } from "vitest";
import { sentEmails } from "@saflib/email-service";
import { courierCallbacks } from "./courier-callbacks.ts";

describe("courierCallbacks", () => {
  afterEach(() => {
    sentEmails.length = 0;
  });

  it("sends a verification email through the mock email service", async () => {
    await courierCallbacks.onVerificationCodeValid?.({
      recipient: "user@example.com",
      user: {
        id: "identity-1",
        email: "user@example.com",
      },
      templateData: {},
      verificationCode: "123456",
      verificationUrl: "http://account.docker.localhost/verification?flow=abc",
      expiresInMinutes: 15,
    });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.to).toBe("user@example.com");
    expect(sentEmails[0]?.subject).toBe("Verify your email address");
    expect(sentEmails[0]?.html).toContain("123456");
    expect(sentEmails[0]?.html).toContain("Verify email");
  });

  it("sends a recovery email through the mock email service", async () => {
    await courierCallbacks.onRecoveryCodeValid?.({
      recipient: "user@example.com",
      user: {
        id: "identity-1",
        email: "user@example.com",
      },
      templateData: {},
      recoveryCode: "654321",
      expiresInMinutes: 15,
    });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]?.to).toBe("user@example.com");
    expect(sentEmails[0]?.subject).toBe("Reset your password");
    expect(sentEmails[0]?.html).toContain("654321");
  });
});
