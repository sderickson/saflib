import express from "express";
import type { Request, Response } from "express";
import type { UserResponse } from "@saflib/auth-spec";
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
