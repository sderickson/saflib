import express from "express";
import { listServiceTokensHandler } from "./list.ts";
import { approveServiceTokensHandler } from "./approve.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/secrets-spec";

export const createServiceTokensRouter = () => {
  const router = express.Router();

  // Define routes for service-tokens
  router.use(
    "/",
    createScopedMiddleware({
      apiSpec: jsonSpec,
      adminRequired: true,
    }),
  );
  router.get("/", listServiceTokensHandler);
  router.post("/:id/approve", approveServiceTokensHandler);

  return router;
};
