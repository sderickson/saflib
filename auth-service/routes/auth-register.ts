import { Router } from "express";
import type { RegisterRequest, UserResponse } from "@saflib/auth-spec";
import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import type { User } from "../types.ts";

export const registerRouter = Router();

// Helper function to get user scopes
async function getUserScopes(db: any, userId: number): Promise<string[]> {
  const permissions = await db.permissions.getByUserId(userId);
  return permissions.map((p: any) => p.permission);
}

// Helper function to create user response
async function createUserResponse(db: any, user: User): Promise<UserResponse> {
  const scopes = await getUserScopes(db, user.id);
  return {
    id: user.id,
    email: user.email,
    scopes,
  };
}

registerRouter.post(
  "/register",
  createHandler(async (req, res) => {
    try {
      const registerRequest: RegisterRequest = req.body;
      const { email, password } = registerRequest;

      // Hash the password with argon2
      const passwordHash = await argon2.hash(password);

      // Create the user
      const user = await req.db.users.create({
        email,
        createdAt: new Date(),
      });

      // Auto-assign admin permission for test environment users with admin.*@email.com pattern
      if (
        process.env.ALLOW_ADMIN_SIGNUPS === "true" &&
        email.match(/^admin\..*@email\.com$/)
      ) {
        await req.db.permissions.add(user.id, "admin", user.id);
      }

      // Create email auth record
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

      // Create and return user response
      const userResponse = await createUserResponse(req.db, user);
      res.status(200).json(userResponse);
    } catch (err) {
      if (err instanceof req.db.users.EmailConflictError) {
        res.status(409).json({ message: "Email already exists" });
        return;
      }
      throw err;
    }
  }),
);
