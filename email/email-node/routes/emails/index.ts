import express from "express";
import { getSentEmails } from "./get-sent-emails.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/email-spec";

export interface EmailsRouterOptions {
  apiSpec?: any;
}

export function createEmailsRouter(options: EmailsRouterOptions = {}) {
  const router = express.Router();

  const scopedMiddleware = createScopedMiddleware({
    apiSpec: options.apiSpec || jsonSpec,
    authRequired: false,
  });

  router.use("/email", scopedMiddleware);
  router.get("/email/sent", getSentEmails);

  return router;
}
