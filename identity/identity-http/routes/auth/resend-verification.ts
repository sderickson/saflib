import { createHandler } from "@saflib/express";
import { randomBytes } from "crypto";
import { type AuthResponse } from "@saflib/identity-spec";
import { identityDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/identity-links";

export const resendVerificationHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;
  if (!req.user) {
    res.status(401).json({
      message: "User must be logged in",
    } satisfies AuthResponse["resendVerification"][401]);
    return;
  }

  const verificationToken = randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date();
  verificationTokenExpiresAt.setMinutes(
    verificationTokenExpiresAt.getMinutes() + 15,
  );

  await identityDb.emailAuth.updateVerificationToken(
    dbKey,
    req.user.id,
    verificationToken,
    verificationTokenExpiresAt,
  );

  const verificationUrl = linkToHref(authLinks.verifyEmail, {
    params: { token: verificationToken },
  });
  const { callbacks } = authServiceStorage.getStore()!;
  if (callbacks.onVerificationTokenCreated) {
    await callbacks.onVerificationTokenCreated(req.user, verificationUrl, true);
  }

  const response: AuthResponse["resendVerification"][200] = {
    success: true,
    message: "Verification email sent",
  };
  res.status(200).json(response);
});
