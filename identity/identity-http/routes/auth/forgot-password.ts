import { randomBytes } from "crypto";
import { createHandler } from "@saflib/express";
import type {
  IdentityResponseBody,
  IdentityRequestBody,
} from "@saflib/identity-spec";
import { usersDb, UserNotFoundError, emailAuthDb } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";
import { getSafReporters } from "@saflib/node";

export const forgotPasswordHandler = createHandler(async (req, res) => {
  const { email } = req.body as IdentityRequestBody["forgotPassword"];
  const { dbKey, callbacks } = authServiceStorage.getStore()!;
  const { result: user, error } = await usersDb.getByEmail(dbKey, email);
  const { log } = getSafReporters();

  const commonResponse: IdentityResponseBody["forgotPassword"][200] = {
    success: true,
    message: "If the email exists, a recovery email has been sent",
  };

  if (error) {
    switch (true) {
      case error instanceof UserNotFoundError:
        log.info(`User not found for email: ${email}`);
        res.status(200).json(commonResponse);
        return;
      default:
        throw error satisfies never;
    }
  }

  const token = randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  await emailAuthDb.updateForgotPasswordToken(dbKey, user.id, token, expiresAt);

  const resetUrl = linkToHref(authLinks.resetPassword, {
    params: { token },
  });

  if (callbacks.onPasswordReset) {
    await callbacks.onPasswordReset({ user, resetUrl });
  }

  res.status(200).json(commonResponse);
});
