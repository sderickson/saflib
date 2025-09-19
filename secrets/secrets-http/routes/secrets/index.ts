import express from "express";
import { listHandler } from "./list.ts";
import { createSecretHandler } from "./create.ts";
import { updateHandler } from "./update.ts";
import { deleteHandler } from "./delete.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/secrets-spec";

export const createSecretsRouter = () => {
  const router = express.Router();

  // Define routes for secrets
  router.use(
    "/",
    createScopedMiddleware({
      apiSpec: jsonSpec,
      adminRequired: true,
    }),
  );
  router.get("/", listHandler);
  router.post("/", createSecretHandler);
  router.put("/:id", updateHandler);
  router.delete("/:id", deleteHandler);

  return router;
};
