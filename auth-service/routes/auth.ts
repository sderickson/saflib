import express from "express";
import type { Request, Response } from "express";
import passport from "passport";
import type { IVerifyOptions } from "passport-local";
import type { RegisterRequest, UserResponse } from "@saflib/auth-spec";
import type { AuthDB } from "@saflib/auth-db";
import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import type { User } from "../types.ts";
import crypto from "crypto";

export const authRouter = express.Router();

// Helper function to get user scopes
async function getUserScopes(db: AuthDB, userId: number): Promise<string[]> {
  const permissions = await db.permissions.getByUserId(userId);
  return permissions.map((p) => p.permission);
}

// Helper function to create user response
async function createUserResponse(
  db: AuthDB,
  user: User,
): Promise<UserResponse> {
  const scopes = await getUserScopes(db, user.id);
  return {
    id: user.id,
    email: user.email,
    scopes,
  };
}

authRouter.post(
  "/forgot-password",
  createHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };

    try {
      // Find user by email
      const user = await req.db.users.getByEmail(email);

      // Generate a secure random token
      const token = crypto.randomBytes(8).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      // Update the user's forgot password token
      const result = await req.db.emailAuth.updateForgotPasswordToken(
        user.id,
        token,
        expiresAt,
      );
      req.log.info(
        `Updated forgot password token for ${email}: ${JSON.stringify(result)}`,
      );

      // TODO: Send email with reset link
      // This will be implemented in a separate task
      req.log.info(
        `Password reset link: ${process.env.PROTOCOL}://${process.env.DOMAIN}/auth/reset-password?token=${token}`,
      );

      res.status(200).json({
        success: true,
        message: "If the email exists, a recovery email has been sent",
      });
    } catch (err) {
      if (err instanceof req.db.users.UserNotFoundError) {
        // Return success even if user doesn't exist to prevent email enumeration
        res.status(200).json({
          success: true,
          message: "If the email exists, a recovery email has been sent",
        });
        return;
      }
      throw err; // Re-throw other errors to be handled by error middleware
    }
  }),
);

authRouter.post(
  "/reset-password",
  createHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as {
      token: string;
      newPassword: string;
    };

    try {
      const emailAuth = await req.db.emailAuth.getByForgotPasswordToken(token);
      if (
        !emailAuth.forgotPasswordTokenExpiresAt ||
        emailAuth.forgotPasswordTokenExpiresAt < new Date()
      ) {
        res.status(404).json({ message: "Invalid or expired token" });
        return;
      }

      const passwordHash = await argon2.hash(newPassword);

      await req.db.emailAuth.updatePassword(
        emailAuth.userId,
        Buffer.from(passwordHash),
      );
      await req.db.emailAuth.clearForgotPasswordToken(emailAuth.userId);

      res.status(200).json({ success: true });
    } catch (err) {
      if (err instanceof req.db.emailAuth.TokenNotFoundError) {
        res.status(404).json({ message: "Invalid or expired token" });
        return;
      }
      throw err; // Re-throw other errors to be handled by error middleware
    }
  }),
);

authRouter.post(
  "/verify-email",
  createHandler(async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Missing or invalid verification token" });
      return;
    }

    // Get user by verification token
    const emailAuth = await req.db.emailAuth.getByVerificationToken(token);
    if (!emailAuth) {
      res.status(404).json({ error: "Invalid or expired verification token" });
      return;
    }

    // Check if token is expired
    if (
      !emailAuth.verificationTokenExpiresAt ||
      emailAuth.verificationTokenExpiresAt < new Date()
    ) {
      res.status(400).json({ error: "Verification token has expired" });
      return;
    }

    // Verify the email
    await req.db.emailAuth.verifyEmail(emailAuth.userId);

    // Get the user
    const user = await req.db.users.getById(emailAuth.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Create and return user response
    const userResponse = await createUserResponse(req.db, user);
    res.status(200).json(userResponse);
  }),
);

authRouter.post(
  "/resend-verification",
  createHandler(async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "User must be logged in" });
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date();
    verificationTokenExpiresAt.setMinutes(
      verificationTokenExpiresAt.getMinutes() + 15,
    ); // 15 minute expiration

    // Update verification token
    await req.db.emailAuth.updateVerificationToken(
      req.user.id,
      verificationToken,
      verificationTokenExpiresAt,
    );

    // Log the verification link (in production this would send an email)
    console.log(`Verification link: /verify-email?token=${verificationToken}`);

    res.status(200).json({ message: "Verification email sent" });
  }),
);
