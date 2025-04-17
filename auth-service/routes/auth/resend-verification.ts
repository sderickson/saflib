import { createHandler } from "@saflib/node-express";
import { randomBytes } from "crypto";
import { type AuthResponse } from "@saflib/auth-spec";
import { EmailClient } from "@saflib/email";
import { generateVerificationEmail } from "../../email-templates/verify-email.ts";
import { AuthDB } from "@saflib/auth-db";

export const resendVerificationHandler = createHandler(async (req, res) => {
  const db: AuthDB = req.app.locals.db;
  if (!req.user) {
    res.status(401).json({
      error: "User must be logged in",
    } satisfies AuthResponse["resendVerification"][401]);
    return;
  }

  const verificationToken = randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date();
  verificationTokenExpiresAt.setMinutes(
    verificationTokenExpiresAt.getMinutes() + 15,
  );

  await db.emailAuth.updateVerificationToken(
    req.user.id,
    verificationToken,
    verificationTokenExpiresAt,
  );

  req.log.info(
    `Verification link: ${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/verify-email?token=${verificationToken}`,
  );

  // Send verification email
  const emailClient = new EmailClient();
  const verificationUrl = `${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/verify-email?token=${verificationToken}`;
  const { subject, html } = generateVerificationEmail(verificationUrl, true);

  try {
    await emailClient.sendEmail({
      to: req.user.email,
      from: process.env.SMTP_FROM,
      subject,
      html,
    });
    req.log.info(`Verification email successfully resent to ${req.user.email}`);
  } catch (emailError) {
    req.log.error(
      `Failed to resend verification email to ${req.user.email}. Error: ${emailError}`,
    );
  }

  const response: AuthResponse["resendVerification"][200] = {
    success: true,
    message: "Verification email sent",
  };
  res.status(200).json(response);
});
