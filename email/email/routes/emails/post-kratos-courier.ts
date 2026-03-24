import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import { emailClient } from "../../client/email-client.ts";

export interface KratosCourierBody {
  recipient: string;
  template_type: string;
  template_data?: Record<string, unknown>;
}

function buildMessage(body: KratosCourierBody): {
  subject: string;
  text: string;
  html?: string;
} {
  const { template_type, template_data: td = {} } = body;
  const verificationUrl = td.verification_url as string | undefined;
  const recoveryUrl = td.recovery_url as string | undefined;
  const verificationCode = td.verification_code as string | undefined;
  const recoveryCode = td.recovery_code as string | undefined;

  if (template_type.includes("verification")) {
    const lines = [
      verificationCode ? `Code: ${verificationCode}` : null,
      verificationUrl ? `Link: ${verificationUrl}` : null,
    ].filter(Boolean);
    return {
      subject: "Verify your email",
      text: lines.join("\n") || JSON.stringify(td),
      html: verificationUrl
        ? `<p><a href="${verificationUrl}">Verify your email</a></p>`
        : undefined,
    };
  }

  if (template_type.includes("recovery")) {
    const lines = [
      recoveryCode ? `Code: ${recoveryCode}` : null,
      recoveryUrl ? `Link: ${recoveryUrl}` : null,
    ].filter(Boolean);
    return {
      subject: "Account recovery",
      text: lines.join("\n") || JSON.stringify(td),
      html: recoveryUrl
        ? `<p><a href="${recoveryUrl}">Reset your password</a></p>`
        : undefined,
    };
  }

  return {
    subject: `Kratos: ${template_type}`,
    text: JSON.stringify({ template_type, template_data: td }, null, 2),
  };
}

export const postKratosCourier = createHandler(async (req, res) => {
  const { log } = getSafReporters();
  const body = req.body as KratosCourierBody;

  if (!body?.recipient || !body?.template_type) {
    throw createError(400, "Invalid Kratos courier payload");
  }

  log.info("Kratos courier email", {
    template_type: body.template_type,
    recipient: body.recipient,
  });

  const { subject, text, html } = buildMessage(body);

  await emailClient.sendEmail({
    to: body.recipient,
    subject,
    text,
    html,
  });

  res.status(204).end();
});
