import * as argon2 from "argon2";
import { createHandler } from "@saflib/express";
import { createUserResponse } from "./_helpers.ts";
import type { AuthResponse, AuthRequest } from "@saflib/auth-spec";
import { randomBytes } from "crypto";
import { authDb, EmailConflictError } from "@saflib/auth-db";
import { authServiceStorage } from "../../context.ts";
import { linkToHref } from "@saflib/links";
import { authLinks } from "@saflib/auth-links";
import { getSafReporters } from "@saflib/node";

export const registerHandler = createHandler(async (req, res) => {
  const { dbKey } = authServiceStorage.getStore()!;
  const { log } = getSafReporters();
  const registerRequest: AuthRequest["registerUser"] = req.body;
  const { email, password, name, givenName, familyName } = registerRequest;

  const passwordHash = await argon2.hash(password);

  const { result: user, error } = await authDb.users.create(dbKey, {
    email,
    name,
    givenName,
    familyName,
  });
  if (error) {
    switch (true) {
      case error instanceof EmailConflictError:
        res.status(409).json({
          message: "Email already exists",
        });
        return;
      default:
        throw error satisfies never;
    }
  }

  await authDb.emailAuth.create(dbKey, {
    userId: user.id,
    email,
    passwordHash,
    verifiedAt: null,
    verificationToken: null,
    verificationTokenExpiresAt: null,
    forgotPasswordToken: null,
    forgotPasswordTokenExpiresAt: null,
  });

  const verificationToken = randomBytes(16).toString("hex");
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await authDb.emailAuth.updateVerificationToken(
    dbKey,
    user.id,
    verificationToken,
    verificationTokenExpiresAt,
  );

  const promises = [];
  const { callbacks } = authServiceStorage.getStore()!;
  if (callbacks.onUserCreated) {
    promises.push(callbacks.onUserCreated(user));
  }

  const verificationUrl = linkToHref(authLinks.verifyEmail, {
    params: { token: verificationToken },
  });
  log.info(`Verification URL: ${verificationUrl}`);
  if (callbacks.onVerificationTokenCreated) {
    promises.push(
      callbacks.onVerificationTokenCreated(user, verificationUrl, false),
    );
  }

  await Promise.all(promises);

  req.logIn(user, (err) => {
    if (err) {
      throw err;
    }

    createUserResponse(dbKey, user).then((response) => {
      const successResponse: AuthResponse["registerUser"][200] = response;
      res.status(200).json(successResponse);
    });
  });
});
