import * as argon2 from "argon2";
import { createHandler } from "@saflib/node-express";
import { createUserResponse } from "./helpers.ts";
import { ResponseSchema, RequestSchema } from "@saflib/auth-spec";

export const registerHandler = createHandler(async (req, res) => {
  try {
    const registerRequest: RequestSchema<"registerUser"> = req.body;
    const { email, password } = registerRequest;

    // Hash the password with argon2
    const passwordHash = await argon2.hash(password);

    // Create the user
    const user = await req.db.users.create({
      email,
      createdAt: new Date(),
    });

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

    // Log in the user
    req.logIn(user, (err) => {
      if (err) {
        throw err;
      }

      // Create and return user response
      createUserResponse(req.db, user).then((response) => {
        const successResponse: ResponseSchema<"registerUser", 200> = response;
        res.status(200).json(successResponse);
      });
    });
  } catch (err) {
    if (err instanceof req.db.users.EmailConflictError) {
      const errorResponse: ResponseSchema<"registerUser", 409> = {
        error: "Email already exists",
      };
      res.status(409).json(errorResponse);
      return;
    }
    throw err;
  }
});
