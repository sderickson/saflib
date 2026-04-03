import express from "express";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/email-spec";
import type { EmailService } from "../EmailService.ts";
import { createGetSentEmailsHandler } from "./get-sent-emails.ts";

export interface EmailsRouterOptions {
  /** Service used to decide whether listing sent emails is allowed (mock only). */
  emailService: EmailService;
  /** Defaults to {@link jsonSpec} from `@saflib/email-spec`. */
  apiSpec?: Parameters<typeof createScopedMiddleware>[0]["apiSpec"];
}

/**
 * Express routes to inspect mock-sent emails (E2E / dev tooling).
 */
export function createEmailsRouter(options: EmailsRouterOptions) {
  const router = express.Router();

  const scopedMiddleware = createScopedMiddleware({
    apiSpec: options.apiSpec || jsonSpec,
    enforceAuth: false,
  });

  router.use("/email", scopedMiddleware);
  router.get("/email/sent", createGetSentEmailsHandler(options.emailService));

  return router;
}
