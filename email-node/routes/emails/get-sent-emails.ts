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
} from "@saflib/email-spec";

export const getSentEmails = createHandler(async (_req, res) => {
  if (!mockingOn) {
    throw createError(403, "Forbidden - server is not mocking email sends");
  }

  res
    .status(200)
    .json(
      sentEmails.map(
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
