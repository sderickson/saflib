import express from "express";
import { getSentEmails } from "./get-sent-emails.ts";
import { createPreMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/email-spec";

export function createEmailsRouter() {
  const router = express.Router();

  const preMiddleware = createPreMiddleware({
    apiSpec: jsonSpec,
    authRequired: false,
  });

  router.use("/email", preMiddleware);
  router.get("/email/sent", getSentEmails);

  return router;
}
