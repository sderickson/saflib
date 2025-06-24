import { createHandler } from "@saflib/express";
import createError from "http-errors";
import { mockingOn, sentEmails } from "../../client/email-client.ts";

export const getSentEmails = createHandler(async (req, res) => {
  if (!mockingOn) {
    throw createError(403, "Forbidden - server is not mocking email sends");
  }

  res.status(200).json(sentEmails);
});
