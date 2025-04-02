import { Router } from "express";
import { createHandler } from "@saflib/node-express";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import { createUserResponse } from "./helpers.ts";

const loginRouter = Router();

loginRouter.post(
  "/login",
  createHandler(async function (req, res, next) {
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
          return res.status(401).json({ message: "Invalid credentials" });
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          createUserResponse(req.db, user).then((response) => {
            res.json(response);
          });
        });
      },
    )(req, res, next);
  }),
);

export { loginRouter };
