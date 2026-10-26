import createError from "http-errors";
import { createHandler } from "@saflib/express";
import { getSafReporters } from "@saflib/node";
import type {
  KratosCourierCallbacks,
  KratosCourierTemplateId,
  User,
} from "../courier-callbacks.ts";
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
  courierCallbacks: KratosCourierCallbacks,
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
      await courierCallbacks.onRecoveryCodeValid?.({
        recipient,
        user,
        templateData: td,
        recoveryCode: readString(td, "recovery_code") ?? "",
        expiresInMinutes,
      });
      return;
    case "recovery.valid":
      await courierCallbacks.onRecoveryValid?.({
        recipient,
        user,
        templateData: td,
        recoveryUrl: readString(td, "recovery_url") ?? "",
      });
      return;
    case "verification_code.valid":
      await courierCallbacks.onVerificationCodeValid?.({
        recipient,
        user,
        templateData: td,
        verificationCode: readString(td, "verification_code") ?? "",
        verificationUrl: readString(td, "verification_url"),
        expiresInMinutes,
      });
      return;
    case "verification.valid":
      await courierCallbacks.onVerificationValid?.({
        recipient,
        user,
        templateData: td,
        verificationUrl: readString(td, "verification_url") ?? "",
      });
      return;
    case "login_code.valid":
      await courierCallbacks.onLoginCodeValid?.({
        recipient,
        user,
        templateData: td,
        loginCode: readString(td, "login_code") ?? "",
        loginUrl: readString(td, "login_url"),
        expiresInMinutes,
      });
      return;
    case "registration_code.valid":
      await courierCallbacks.onRegistrationCodeValid?.({
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

/** How long a delivered message is remembered, to drop Kratos redeliveries of it. */
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

/** Fields that make one courier message unique: its code, or failing that its link. */
const MESSAGE_IDENTITY_FIELDS = [
  "verification_code",
  "recovery_code",
  "login_code",
  "registration_code",
  "verification_url",
  "recovery_url",
  "login_url",
  "registration_url",
] as const;

/**
 * Identifies one courier message, or undefined if it carries nothing unique
 * (then it's always sent). Kratos redelivers a message it thinks failed, for
 * example when our reply is slower than its HTTP timeout even though the
 * email went out; a redelivery has the same recipient, template and code.
 */
export function courierMessageKey(
  templateId: KratosCourierTemplateId,
  recipient: string,
  td: Record<string, unknown>,
): string | undefined {
  for (const field of MESSAGE_IDENTITY_FIELDS) {
    const value = readString(td, field);
    if (value) return JSON.stringify([templateId, recipient, field, value]);
  }
  return undefined;
}

export function createPostKratosCourierHandler(
  courierCallbacks: KratosCourierCallbacks = {},
) {
  // Per handler: messages delivered (or being delivered) recently, so a
  // redelivery waits for or reuses the first attempt instead of emailing again.
  const recent = new Map<string, { at: number; delivery: Promise<void> }>();

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

    const now = Date.now();
    for (const [key, entry] of recent) {
      if (now - entry.at > DUPLICATE_WINDOW_MS) recent.delete(key);
    }

    const key = courierMessageKey(templateId, body.recipient, td);
    const earlier = key ? recent.get(key) : undefined;
    if (earlier) {
      try {
        await earlier.delivery;
        log.info(`Skipped duplicate Kratos courier delivery ${templateId}`, {
          template_id: templateId,
          recipient: body.recipient,
        });
        res.status(204).end();
        return;
      } catch {
        // The first attempt failed, so this redelivery should send it.
      }
    }

    const delivery = dispatchCallback(templateId, courierCallbacks, {
      recipient: body.recipient,
      user,
      td,
    });
    if (key) recent.set(key, { at: now, delivery });
    try {
      await delivery;
    } catch (error) {
      if (key && recent.get(key)?.delivery === delivery) recent.delete(key);
      throw error;
    }

    res.status(204).end();
  });
}
