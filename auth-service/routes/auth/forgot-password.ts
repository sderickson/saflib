import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import { createHandler } from "@saflib/express";
import { type AuthResponse } from "@saflib/auth-spec";
import { EmailClient } from "@saflib/email";
import { generatePasswordResetEmail } from "../../email-templates/password-reset.ts";
import { getSafContext } from "@saflib/node";
import { authDb } from "@saflib/auth-db";
import { authServiceStorage } from "../../context.ts";
import { throwError } from "@saflib/monorepo";

export const forgotPasswordHandler = createHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const { log } = getSafContext();
    const { dbKey } = authServiceStorage.getStore()!;
    const { result: user, error } = await authDb.users.getByEmail(dbKey, email);
    if (error) {
      const successResponse: AuthResponse["forgotPassword"][200] = {
        success: true,
        message: "If the email exists, a recovery email has been sent",
      };
      res.status(200).json(successResponse);
      return;
    }
    const token = randomBytes(8).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await authDb.emailAuth.updateForgotPasswordToken(
      dbKey,
      user.id,
      token,
      expiresAt,
    );

    const emailClient = new EmailClient();
    const resetUrl = `${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/reset-password?token=${token}`;
    const { subject, html } = generatePasswordResetEmail(resetUrl);

    await emailClient.sendEmail({
      to: user.email,
      from: process.env.SMTP_FROM,
      subject,
      html,
    });
    log.info(`Password reset email successfully sent to ${user.email}`);
    const successResponse: AuthResponse["forgotPassword"][200] = {
      success: true,
      message: "If the email exists, a recovery email has been sent",
    };
    res.status(200).json(successResponse);
  },
);
