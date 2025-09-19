import express from "express";
import { listHandler } from "./list.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/secrets-spec";

export const createAccessRequestsRouter = () => {
  const router = express.Router();

  // Define routes for access-requests
  router.use(
    "/",
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );
  router.get("/", listHandler);

  return router;
};
