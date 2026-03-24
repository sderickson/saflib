import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import { emailClient } from "@saflib/email";
import type { IdentityServiceCallbacks } from "../callbacks.ts";
import { kratosIdentityToUser } from "../kratos-map.ts";

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

export function createPostKratosCourierHandler(
  callbacks: IdentityServiceCallbacks = {},
) {
  return createHandler(async (req, res) => {
    const { log } = getSafReporters();
    const body = req.body as KratosCourierBody;

    if (!body?.recipient || !body?.template_type) {
      throw createError(400, "Invalid Kratos courier payload");
    }

    const td = body.template_data ?? {};
    const identity = td.identity;
    const user = kratosIdentityToUser(identity);

    log.info("Kratos courier email", {
      template_type: body.template_type,
      recipient: body.recipient,
    });

    const tt = body.template_type.toLowerCase();

    if (tt.includes("verification")) {
      const verificationUrl = String(td.verification_url ?? "");
      const isResend =
        tt.includes("resend") ||
        tt.includes("reminder") ||
        tt.includes("second");
      await callbacks.onVerificationTokenCreated?.({
        user,
        verificationUrl,
        isResend,
      });
    } else if (tt.includes("recovery")) {
      const resetUrl = String(td.recovery_url ?? "");
      await callbacks.onPasswordReset?.({
        user,
        resetUrl,
      });
    } else if (
      tt.includes("password") &&
      (tt.includes("updated") ||
        tt.includes("changed") ||
        tt.includes("credential"))
    ) {
      await callbacks.onPasswordUpdated?.({ user });
    }

    const { subject, text, html } = buildMessage(body);

    await emailClient.sendEmail({
      to: body.recipient,
      subject,
      text,
      html,
    });

    res.status(204).end();
  });
}
