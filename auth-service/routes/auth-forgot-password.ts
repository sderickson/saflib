import type { Request, Response } from "express";
import crypto from "crypto";
import { createHandler } from "@saflib/node-express";

export const forgotPasswordHandler = createHandler(
  async (req: Request, res: Response) => {
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
  },
);
