import { jsonSpec } from "@saflib/identity-spec";
import { listUsersHandler } from "./list.ts";
import express from "express";
import { createPreMiddleware } from "@saflib/express";

export const makeUsersRouter = () => {
  const router = express.Router();
  router.use(
    createPreMiddleware({
      apiSpec: jsonSpec,
      subsystemName: "users",
    }),
  );

  router.get("/", listUsersHandler);
  return router;
};
