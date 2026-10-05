import { describe, expect, it } from "vitest";
import { TanstackError } from "@saflib/sdk";
import { AUTH_ERROR_MFA_REQUIRED } from "@saflib/utils/auth-error-codes";
import { describeAsyncPageError } from "./async-page-error-message.ts";

describe("describeAsyncPageError", () => {
  it("tells the user when MFA is required and links to the configured page", () => {
    expect(
      describeAsyncPageError(
        new TanstackError(403, AUTH_ERROR_MFA_REQUIRED),
        { mfaRequiredHref: "https://account.example/mfa" },
      ),
    ).toEqual({
      message: "Multi-factor authentication is required.",
      action: {
        label: "Set up MFA",
        href: "https://account.example/mfa",
      },
    });
  });

  it("still explains MFA when the app has no link configured", () => {
    expect(
      describeAsyncPageError(new TanstackError(403, AUTH_ERROR_MFA_REQUIRED)),
    ).toEqual({
      message: "Multi-factor authentication is required.",
    });
  });

  it("keeps a plain forbidden response as Forbidden", () => {
    expect(describeAsyncPageError(new TanstackError(403))).toEqual({
      message: "Forbidden",
    });
  });
});
