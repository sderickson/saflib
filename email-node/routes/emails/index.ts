import express from "express";
import { getSentEmails } from "./get-sent-emails.ts";
import { createPreMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/email-spec";

export interface EmailsRouterOptions {
  serviceName: string; // Should be just the name of the service, such as at the docker level
  apiSpec?: any;
}

export function createEmailsRouter(options: EmailsRouterOptions) {
  const router = express.Router();

  const preMiddleware = createPreMiddleware({
    apiSpec: options.apiSpec || jsonSpec,
    authRequired: false,
    serviceName: options.serviceName + ".http.emails",
  });

  router.use("/email", preMiddleware);
  router.get("/email/sent", getSentEmails);

  return router;
}
