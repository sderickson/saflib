import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./_helpers.ts";
import type { AuthResponse, AuthRequest } from "@saflib/auth-spec";
import { randomBytes } from "crypto";
import { EmailClient } from "@saflib/email";
import { generateVerificationEmail } from "../../email-templates/verify-email.ts";
import { AuthDB } from "@saflib/auth-db";

export const registerHandler = createHandler(async (req, res) => {
  const db: AuthDB = req.app.locals.db;
  try {
    const registerRequest: AuthRequest["registerUser"] = req.body;
    const { email, password } = registerRequest;

    const passwordHash = await argon2.hash(password);

    const user = await db.users.create({
      email,
      createdAt: new Date(),
    });

    await db.emailAuth.create({
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
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    await db.emailAuth.updateVerificationToken(
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
    req.log.info(`Verification email successfully sent to ${user.email}`);

    req.logIn(user, (err) => {
      if (err) {
        throw err;
      }

      createUserResponse(db, user).then((response) => {
        const successResponse: AuthResponse["registerUser"][200] = response;
        res.status(200).json(successResponse);
      });
    });
  } catch (err) {
    if (err instanceof db.users.EmailConflictError) {
      const errorResponse: AuthResponse["registerUser"][409] = {
        message: "Email already exists",
      };
      res.status(409).json(errorResponse);
      return;
    }
    throw err;
  }
});
