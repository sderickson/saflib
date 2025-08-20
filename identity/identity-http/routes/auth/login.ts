import { createHandler } from "@saflib/express";
import passport from "passport";
import { type IVerifyOptions } from "passport-local";
import { createUserResponse } from "./_helpers.ts";
import { type AuthResponse } from "@saflib/identity-spec";
import { authServiceStorage } from "@saflib/identity-common";
export const loginHandler = createHandler(async function (req, res, next) {
  const { dbKey } = authServiceStorage.getStore()!;
  passport.authenticate(
    "local",
    (
      err: Error | null,
      user: Express.User | false,
      _info: IVerifyOptions | undefined,
    ) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        const response: AuthResponse["loginUser"][401] = {
          message: "Invalid credentials",
        };
        return res.status(401).json(response);
      }

      req.logIn(user, (err: Error) => {
        if (err) {
          return next(err);
        }

        createUserResponse(dbKey, user).then((response) => {
          const successResponse: AuthResponse["loginUser"][200] = response;
          res.json(successResponse);
        });
      });
    },
  )(req, res, next);
});
