import { createHandler } from "@saflib/express";
import { createUserResponse } from "./_helpers.ts";
import { type AuthResponse } from "@saflib/identity-spec";
import { authDb, VerificationTokenNotFoundError } from "@saflib/identity-db";
import { authServiceStorage } from "@saflib/identity-common";
import { throwError } from "@saflib/monorepo";

export const verifyEmailHandler = createHandler(async (req, res) => {
  const { token } = req.body as { token: string };
  const { dbKey } = authServiceStorage.getStore()!;

  const { result: emailAuth, error } =
    await authDb.emailAuth.getByVerificationToken(dbKey, token);
  if (error) {
    switch (true) {
      case error instanceof VerificationTokenNotFoundError:
        const errorResponse: AuthResponse["verifyEmail"][400] = {
          message: "Invalid or expired verification token",
        };
        res.status(400).json(errorResponse);
        return;
      default:
        throw error satisfies never;
    }
  }
  if (!req.user?.email) {
    const errorResponse: AuthResponse["verifyEmail"][401] = {
      message: "Unauthorized",
    };
    res.status(401).json(errorResponse);
    return;
  }
  if (emailAuth.email !== req.user?.email) {
    const errorResponse: AuthResponse["verifyEmail"][403] = {
      message: "Forbidden",
    };
    res.status(403).json(errorResponse);
    return;
  }
  if (
    !emailAuth.verificationTokenExpiresAt ||
    emailAuth.verificationTokenExpiresAt < new Date()
  ) {
    const errorResponse: AuthResponse["verifyEmail"][400] = {
      message: "Invalid or expired verification token",
    };
    res.status(400).json(errorResponse);
    return;
  }

  await authDb.emailAuth.verifyEmail(dbKey, emailAuth.userId);

  const user = await throwError(authDb.users.getById(dbKey, emailAuth.userId));
  const userResponse = await createUserResponse(dbKey, user);

  const successResponse: AuthResponse["verifyEmail"][200] = userResponse;
  res.status(200).json(successResponse);
});
