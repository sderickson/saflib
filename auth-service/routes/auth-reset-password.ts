import type { Request, Response } from "express";
import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { type AuthResponse } from "@saflib/auth-spec";

export const resetPasswordHandler = createHandler(
  async (req: Request, res: Response) => {
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
        const errorResponse: AuthResponse["resetPassword"][404] = {
          error: "Invalid or expired token",
        };
        res.status(404).json(errorResponse);
        return;
      }

      const passwordHash = await argon2.hash(newPassword);

      await req.db.emailAuth.updatePassword(
        emailAuth.userId,
        Buffer.from(passwordHash),
      );
      await req.db.emailAuth.clearForgotPasswordToken(emailAuth.userId);

      const successResponse: AuthResponse["resetPassword"][200] = {
        success: true,
      };
      res.status(200).json(successResponse);
    } catch (err) {
      if (err instanceof req.db.emailAuth.TokenNotFoundError) {
        const errorResponse: AuthResponse["resetPassword"][404] = {
          error: "Invalid or expired token",
        };
        res.status(404).json(errorResponse);
        return;
      }
      throw err; // Re-throw other errors to be handled by error middleware
    }
  },
);
