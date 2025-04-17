import type { Request, Response } from "express";
import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { type AuthResponse } from "@saflib/auth-spec";
import { AuthDB } from "@saflib/auth-db";

export const resetPasswordHandler = createHandler(
  async (req: Request, res: Response) => {
    const db: AuthDB = req.app.locals.db;
    const { token, newPassword } = req.body as {
      token: string;
      newPassword: string;
    };

    try {
      const emailAuth = await db.emailAuth.getByForgotPasswordToken(token);
      if (
        !emailAuth.forgotPasswordTokenExpiresAt ||
        emailAuth.forgotPasswordTokenExpiresAt < new Date()
      ) {
        const errorResponse: AuthResponse["resetPassword"][400] = {
          error: "Invalid or expired token",
        };
        res.status(400).json(errorResponse);
        return;
      }

      const passwordHash = await argon2.hash(newPassword);

      await db.emailAuth.updatePassword(
        emailAuth.userId,
        Buffer.from(passwordHash),
      );
      await db.emailAuth.clearForgotPasswordToken(emailAuth.userId);

      const successResponse: AuthResponse["resetPassword"][200] = {
        success: true,
      };
      res.status(200).json(successResponse);
    } catch (err) {
      if (err instanceof db.emailAuth.TokenNotFoundError) {
        const errorResponse: AuthResponse["resetPassword"][400] = {
          error: "Invalid or expired token",
        };
        res.status(400).json(errorResponse);
        return;
      }
      throw err;
    }
  },
);
