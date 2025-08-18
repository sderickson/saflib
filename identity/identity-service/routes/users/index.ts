import { jsonSpec } from "@saflib/identity-spec";
import { listUsersHandler } from "./list.ts";
import express from "express";
import { createScopedMiddleware } from "@saflib/express";

export const makeUsersRouter = () => {
  const router = express.Router();
  router.use(
    "/users",
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );

  router.get("/users", listUsersHandler);
  return router;
};
