import express from "express";
import { listServiceTokensHandler } from "./list.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/secrets-spec";

export const createServiceTokensRouter = () => {
  const router = express.Router();

  // Define routes for service-tokens
  router.use(
    "/",
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );
  router.get("/", listServiceTokensHandler);

  return router;
};
