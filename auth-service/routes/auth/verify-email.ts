import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./_helpers.ts";
import { type AuthResponse } from "@saflib/auth-spec";

export const verifyEmailHandler = createHandler(async (req, res) => {
  const { token } = req.body as { token: string };

  try {
    const emailAuth = await req.db.emailAuth.getByVerificationToken(token);

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

    await req.db.emailAuth.verifyEmail(emailAuth.userId);

    const user = await req.db.users.getById(emailAuth.userId);
    const userResponse = await createUserResponse(req.db, user);

    const successResponse: AuthResponse["verifyEmail"][200] = userResponse;
    res.status(200).json(successResponse);
  } catch (err) {
    if (err instanceof req.db.emailAuth.VerificationTokenNotFoundError) {
      const errorResponse: AuthResponse["verifyEmail"][400] = {
        error: "Invalid or expired verification token",
      };
      res.status(400).json(errorResponse);
      return;
    }
    throw err;
  }
});
