import { createHandler } from "@saflib/node-express";
import passport from "passport";
import { type IVerifyOptions } from "passport-local";
import { createUserResponse } from "./helpers.ts";
import { type AuthResponse } from "@saflib/auth-spec";

export const loginHandler = createHandler(async function (req, res, next) {
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
          error: "Invalid credentials",
        };
        return res.status(401).json(response);
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        createUserResponse(req.db, user).then((response) => {
          const successResponse: AuthResponse["loginUser"][200] = response;
          res.json(successResponse);
        });
      });
    },
  )(req, res, next);
});
