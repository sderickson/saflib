import { createHandler } from "@saflib/express";
import createError from "http-errors";
import type { EmailService } from "../EmailService.ts";
import { sentEmails } from "../mock-store.ts";
import type { EmailOptions, SentEmail as NodeSentEmail } from "../types.ts";
import type {
  EmailResponseBody,
  SentEmail as ApiSentEmail,
  EmailRequestQuery,
} from "@saflib/email-spec";

export function createGetSentEmailsHandler(emailService: EmailService) {
  return createHandler(async (req, res) => {
    const query = req.query as EmailRequestQuery["listSentEmails"];
    const { user_email } = query ?? {};

    if (!emailService.isMocked) {
      throw createError(403, "Forbidden - server is not mocking email sends");
    }

    let emails = sentEmails;
    if (user_email) {
      emails = emails.filter(
        (email) =>
          email.to === user_email ||
          email.from === user_email ||
          email.reply_to === user_email,
      );
    }

    res
      .status(200)
      .json(
        emails.map(
          convertEmailOptionsToApiResponse,
        ) satisfies EmailResponseBody["listSentEmails"][200],
      );
  });
}

const convertEmailOptionsToApiResponse = (
  sentEmail: NodeSentEmail,
): ApiSentEmail => {
  return {
    from: convertEmailFieldToString(sentEmail.from)[0] || "",
    to: convertEmailFieldToString(sentEmail.to),
    cc: convertEmailFieldToString(sentEmail.cc),
    bcc: convertEmailFieldToString(sentEmail.bcc),
    subject: sentEmail.subject ?? "<no subject>",
    text: convertTextFieldToString(sentEmail.text),
    html: convertTextFieldToString(sentEmail.html),
    reply_to: convertEmailFieldToString(sentEmail.reply_to),
    time_sent: sentEmail.time_sent,
  };
};

const convertEmailFieldToString = (
  emailField:
    | EmailOptions["to"]
    | EmailOptions["cc"]
    | EmailOptions["bcc"]
    | EmailOptions["from"]
    | EmailOptions["reply_to"],
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
