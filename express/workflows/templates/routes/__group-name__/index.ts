import express from "express";
import { __targetName__Handler } from "./__target-name__.ts";
import { createScopedMiddleware } from "@saflib/express";
// TODO: import the appropriate spec package
// import { jsonSpec } from "@saflib/cron-spec";

export const create__GroupName__Router = () => {
  const router = express.Router();

  // Define routes based on cron_routes.yaml
  router.use(
    "/__group-name__",
    createScopedMiddleware({
      // TODO: uncomment this once the right jsonSpec is imported
      // apiSpec: jsonSpec,
    }),
  );
  router.get("/__group-name__/__target-name__", __targetName__Handler);

  return router;
};
