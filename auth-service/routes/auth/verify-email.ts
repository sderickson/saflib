import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./_helpers.ts";
import { type AuthResponse } from "@saflib/auth-spec";
import { AuthDB } from "@saflib/auth-db";

export const verifyEmailHandler = createHandler(async (req, res) => {
  const { token } = req.body as { token: string };
  const db: AuthDB = req.app.locals.db;

  try {
    const emailAuth = await db.emailAuth.getByVerificationToken(token);

    if (
      !emailAuth.verificationTokenExpiresAt ||
      emailAuth.verificationTokenExpiresAt < new Date() ||
      emailAuth.email !== req.user?.email
    ) {
      const errorResponse: AuthResponse["verifyEmail"][400] = {
        error: "Invalid or expired verification token",
      };
      res.status(400).json(errorResponse);
      return;
    }

    await db.emailAuth.verifyEmail(emailAuth.userId);

    const user = await db.users.getById(emailAuth.userId);
    const userResponse = await createUserResponse(db, user);

    const successResponse: AuthResponse["verifyEmail"][200] = userResponse;
    res.status(200).json(successResponse);
  } catch (err) {
    if (err instanceof db.emailAuth.VerificationTokenNotFoundError) {
      const errorResponse: AuthResponse["verifyEmail"][400] = {
        error: "Invalid or expired verification token",
      };
      res.status(400).json(errorResponse);
      return;
    }
    throw err;
  }
});
