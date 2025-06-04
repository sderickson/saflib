import * as argon2 from "argon2";
import { createHandler } from "@saflib/express";
import { createUserResponse } from "./_helpers.ts";
import type { AuthResponse, AuthRequest } from "@saflib/auth-spec";
import { randomBytes } from "crypto";
import { EmailClient } from "@saflib/email";
import { generateVerificationEmail } from "../../email-templates/verify-email.ts";
import { authDb, EmailConflictError } from "@saflib/auth-db";
import { getSafContext } from "@saflib/node";
import { authServiceStorage } from "../../context.ts";
export const registerHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;
  const registerRequest: AuthRequest["registerUser"] = req.body;
  const { email, password, name, givenName, familyName } = registerRequest;
  const { log } = getSafContext();

  const passwordHash = await argon2.hash(password);

  const { result: user, error } = await authDb.users.create(dbKey, {
    email,
    name,
    givenName,
    familyName,
  });
  if (error) {
    switch (true) {
      case error instanceof EmailConflictError:
        res.status(409).json({
          message: "Email already exists",
        });
        return;
      default:
        throw error satisfies never;
    }
  }

  await authDb.emailAuth.create(dbKey, {
    userId: user.id,
    email,
    passwordHash,
    verifiedAt: null,
    verificationToken: null,
    verificationTokenExpiresAt: null,
    forgotPasswordToken: null,
    forgotPasswordTokenExpiresAt: null,
  });

  // Generate verification token and send email
  const verificationToken = randomBytes(16).toString("hex");
  // Set expiry to 24 hours from now
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await authDb.emailAuth.updateVerificationToken(
    dbKey,
    user.id,
    verificationToken,
    verificationTokenExpiresAt,
  );

  const emailClient = new EmailClient();
  const verificationUrl = `${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/verify-email?token=${verificationToken}`;
  const { subject, html } = generateVerificationEmail(verificationUrl, false);

  await emailClient.sendEmail({
    to: user.email,
    from: process.env.SMTP_FROM, // Use a noreply address
    subject,
    html,
  });
  log.info(`Verification email successfully sent to ${user.email}`);

  req.logIn(user, (err) => {
    if (err) {
      throw err;
    }

    createUserResponse(dbKey, user).then((response) => {
      const successResponse: AuthResponse["registerUser"][200] = response;
      res.status(200).json(successResponse);
    });
  });
});
