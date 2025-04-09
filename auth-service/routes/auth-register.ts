import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./helpers.ts";
import type { AuthResponse, AuthRequest } from "@saflib/auth-spec";
import { randomBytes } from "crypto";
import { EmailClient } from "@saflib/email";
import { generateVerificationEmail } from "../email-templates/verify-email.js";

export const registerHandler = createHandler(async (req, res) => {
  try {
    const registerRequest: AuthRequest["registerUser"] = req.body;
    const { email, password } = registerRequest;

    const passwordHash = await argon2.hash(password);

    const user = await req.db.users.create({
      email,
      createdAt: new Date(),
    });

    await req.db.emailAuth.create({
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

    await req.db.emailAuth.updateVerificationToken(
      user.id,
      verificationToken,
      verificationTokenExpiresAt,
    );

    const emailClient = new EmailClient();
    const verificationUrl = `${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/verify-email?token=${verificationToken}`;
    const { subject, html } = generateVerificationEmail(verificationUrl, false);

    await emailClient.sendEmail({
      to: user.email,
      from: `noreply@${process.env.DOMAIN}`, // Use a noreply address
      subject,
      html,
    });
    req.log.info(`Verification email successfully sent to ${user.email}`);

    req.logIn(user, (err) => {
      if (err) {
        throw err;
      }

      createUserResponse(req.db, user).then((response) => {
        const successResponse: AuthResponse["registerUser"][200] = response;
        res.status(200).json(successResponse);
      });
    });
  } catch (err) {
    if (err instanceof req.db.users.EmailConflictError) {
      const errorResponse: AuthResponse["registerUser"][409] = {
        error: "Email already exists",
      };
      res.status(409).json(errorResponse);
      return;
    }
    throw err;
  }
});
