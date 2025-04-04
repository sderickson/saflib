import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./helpers.ts";
import type { AuthResponse, AuthRequest } from "@saflib/auth-spec";

export const registerHandler = createHandler(async (req, res) => {
  try {
    const registerRequest: AuthRequest["registerUser"] = req.body;
    const { email, password } = registerRequest;

    const passwordHash = await argon2.hash(password);

    const user = await req.db.users.create({
      email,
      createdAt: new Date(),
    });

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

    req.logIn(user, (err) => {
      if (err) {
        throw err;
      }

      createUserResponse(req.db, user).then((response) => {
        const successResponse: AuthResponse["registerUser"][200] = response;
        res.status(200).json(successResponse);
      });
    });
  } catch (err) {
    if (err instanceof req.db.users.EmailConflictError) {
      const errorResponse: AuthResponse["registerUser"][409] = {
        error: "Email already exists",
      };
      res.status(409).json(errorResponse);
      return;
    }
    throw err;
  }
});
