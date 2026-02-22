import express from "express";
import { getSentEmails } from "./get-sent-emails.ts";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/email-spec";

export interface EmailsRouterOptions {
  apiSpec?: any;
}

/**
 * Creates an Express router that can be used to access sent emails. Only used
 * for E2E testing.
 */
export function createEmailsRouter(options: EmailsRouterOptions = {}) {
  const router = express.Router();

  const scopedMiddleware = createScopedMiddleware({
    apiSpec: options.apiSpec || jsonSpec,
    enforceAuth: false,
  });

  router.use("/email", scopedMiddleware);
  router.get("/email/sent", getSentEmails);

  return router;
}
