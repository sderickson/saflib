import express from "express";
import { createHandler } from "@saflib/node-express";

export const authLogoutRouter = express.Router();

authLogoutRouter.post(
  "/logout",
  createHandler(async (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).end();
    });
  }),
);
