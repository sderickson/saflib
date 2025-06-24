import express from "express";
import { getSentEmails } from "./get-sent-emails.ts";

export function createEmailsRouter() {
  const router = express.Router();

  router.get("/sent", getSentEmails);

  return router;
}
