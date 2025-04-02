import type { Request, Response } from "express";
import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";

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
  },
);
