import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import type {
  KratosCourierCallbacks,
  KratosCourierTemplateId,
  User,
} from "../callbacks.ts";
import { kratosIdentityToUser } from "../kratos-map.ts";
import {
  isSupportedValidTemplate,
  normalizeKratosTemplateType,
} from "../kratos-template.ts";

export interface KratosCourierBody {
  recipient: string;
  template_type: string;
  template_data?: Record<string, unknown>;
}

function readString(
  td: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = td[key];
  return typeof v === "string" ? v : undefined;
}

function readNumber(
  td: Record<string, unknown>,
  key: string,
): number | undefined {
  const v = td[key];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

async function dispatchCallback(
  templateId: KratosCourierTemplateId,
  callbacks: KratosCourierCallbacks,
  args: {
    recipient: string;
    user: User;
    td: Record<string, unknown>;
  },
): Promise<void> {
  const { log } = getSafReporters();
  const { recipient, user, td } = args;
  const expiresInMinutes = readNumber(td, "expires_in_minutes");

  switch (templateId) {
    case "recovery_code.valid":
      await callbacks.onRecoveryCodeValid?.({
        recipient,
        user,
        templateData: td,
        recoveryCode: readString(td, "recovery_code") ?? "",
        expiresInMinutes,
      });
      return;
    case "recovery.valid":
      await callbacks.onRecoveryValid?.({
        recipient,
        user,
        templateData: td,
        recoveryUrl: readString(td, "recovery_url") ?? "",
      });
      return;
    case "verification_code.valid":
      await callbacks.onVerificationCodeValid?.({
        recipient,
        user,
        templateData: td,
        verificationCode: readString(td, "verification_code") ?? "",
        verificationUrl: readString(td, "verification_url"),
        expiresInMinutes,
      });
      return;
    case "verification.valid":
      await callbacks.onVerificationValid?.({
        recipient,
        user,
        templateData: td,
        verificationUrl: readString(td, "verification_url") ?? "",
      });
      return;
    case "login_code.valid":
      await callbacks.onLoginCodeValid?.({
        recipient,
        user,
        templateData: td,
        loginCode: readString(td, "login_code") ?? "",
        loginUrl: readString(td, "login_url"),
        expiresInMinutes,
      });
      return;
    case "registration_code.valid":
      await callbacks.onRegistrationCodeValid?.({
        recipient,
        user,
        templateData: td,
        registrationCode: readString(td, "registration_code") ?? "",
        registrationUrl: readString(td, "registration_url"),
        expiresInMinutes,
      });
      return;
    default:
      log.warn(`Unsupported Kratos courier template_type: ${templateId}`);
      log.warn(JSON.stringify(td, null, 2));
      return;
  }
}

export function createPostKratosCourierHandler(
  callbacks: KratosCourierCallbacks = {},
) {
  return createHandler(async (req, res) => {
    const { log } = getSafReporters();
    const body = req.body as KratosCourierBody;

    if (!body?.recipient || !body?.template_type) {
      throw createError(400, "Invalid Kratos courier payload");
    }

    const rawType = body.template_type;
    const normalized = normalizeKratosTemplateType(rawType);

    if (normalized.endsWith(".invalid")) {
      throw createError(
        400,
        `Unsupported Kratos courier template_type (invalid templates not implemented): ${rawType}`,
      );
    }

    if (!isSupportedValidTemplate(normalized)) {
      throw createError(
        400,
        `Unsupported Kratos courier template_type: ${rawType} (normalized: ${normalized})`,
      );
    }

    const templateId = normalized;
    const td = body.template_data ?? {};
    const identity = td.identity;
    const user = kratosIdentityToUser(identity, body.recipient);

    log.info(`Kratos courier email ${templateId}`, {
      template_type: rawType,
      template_id: templateId,
      recipient: body.recipient,
    });

    await dispatchCallback(templateId, callbacks, {
      recipient: body.recipient,
      user,
      td,
    });

    res.status(204).end();
  });
}
