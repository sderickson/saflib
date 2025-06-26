import { createHandler } from "@saflib/express";
import createError from "http-errors";
import {
  type EmailOptions,
  mockingOn,
  sentEmails,
  type SentEmail as NodeSentEmail,
} from "../../client/email-client.ts";
import type {
  EmailResponse,
  SentEmail as ApiSentEmail,
  EmailQuery,
} from "@saflib/email-spec";

export const getSentEmails = createHandler(async (req, res) => {
  const query = req.query as EmailQuery["listSentEmails"];
  const { userEmail } = query ?? {};

  if (!mockingOn) {
    throw createError(403, "Forbidden - server is not mocking email sends");
  }

  let emails = sentEmails;
  if (userEmail) {
    emails = emails.filter(
      (email) => email.to === userEmail || email.from === userEmail,
    );
  }

  res
    .status(200)
    .json(
      emails.map(
        convertEmailOptionsToApiResponse,
      ) satisfies EmailResponse["listSentEmails"][200],
    );
});

const convertEmailOptionsToApiResponse = (
  sentEmail: NodeSentEmail,
): ApiSentEmail => {
  return {
    from: convertEmailFieldToString(sentEmail.from)[0],
    to: convertEmailFieldToString(sentEmail.to),
    cc: convertEmailFieldToString(sentEmail.cc),
    bcc: convertEmailFieldToString(sentEmail.bcc),
    subject: sentEmail.subject ?? "<no subject>",
    text: convertTextFieldToString(sentEmail.text),
    html: convertTextFieldToString(sentEmail.html),
    replyTo: convertEmailFieldToString(sentEmail.replyTo),
    timeSent: sentEmail.timeSent,
  };
};

const convertEmailFieldToString = (
  emailField:
    | EmailOptions["to"]
    | EmailOptions["cc"]
    | EmailOptions["bcc"]
    | EmailOptions["from"],
): string[] => {
  if (Array.isArray(emailField)) {
    return emailField.map(convertEmailFieldToString).flat();
  }
  if (typeof emailField === "string") {
    return [emailField];
  }
  if (!emailField) {
    return [];
  }
  return [`${emailField.name} <${emailField.address}>`];
};

const convertTextFieldToString = (
  textField: EmailOptions["text"] | EmailOptions["html"],
): string => {
  if (typeof textField === "string") {
    return textField;
  }
  if (!textField) {
    return "";
  }
  return textField.toString();
};
