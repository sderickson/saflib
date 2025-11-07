import express from "express";
import { listHandler } from "./list.ts";
import { createScopedMiddleware } from "@saflib/express";
// TODO: import the appropriate spec package
// import { jsonSpec } from "@saflib/cron-spec";

export const createUsersRouter = () => {
  const router = express.Router();

  // Define routes based on cron_routes.yaml
  router.use(
    "/users",
    createScopedMiddleware({
      // TODO: uncomment this once the right jsonSpec is imported
      // apiSpec: jsonSpec,
    }),
  );
  router.get("/users/list", listHandler);

  return router;
};
