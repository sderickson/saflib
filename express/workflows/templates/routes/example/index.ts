import express from "express";
import { templateFileHandler } from "./template-file.ts";
import { createScopedMiddleware } from "@saflib/express";
// TODO: import the appropriate spec package
// import { jsonSpec } from "@saflib/cron-spec";

export const createResourceNameRouter = () => {
  const router = express.Router();

  // Define routes based on cron_routes.yaml
  router.use(
    "/resource-name",
    createScopedMiddleware({
      // TODO: uncomment this once the right jsonSpec is imported
      // apiSpec: jsonSpec,
    })
  );
  router.get("/resource-name/route-name", templateFileHandler);

  return router;
};
