import type { KratosCourierTemplateId } from "./callbacks.ts";

/** Kratos may send `verification_code.valid` or `verification_code_valid`. */
export function normalizeKratosTemplateType(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t.includes(".")) {
    return t;
  }
  const m = t.match(/^(.+)_(valid|invalid)$/);
  if (m) {
    return `${m[1]}.${m[2]}`;
  }
  return t;
}

const SUPPORTED_VALID: ReadonlySet<KratosCourierTemplateId> = new Set([
  "recovery_code.valid",
  "recovery.valid",
  "verification_code.valid",
  "verification.valid",
  "login_code.valid",
  "registration_code.valid",
]);

export function isSupportedValidTemplate(
  normalized: string,
): normalized is KratosCourierTemplateId {
  return SUPPORTED_VALID.has(normalized as KratosCourierTemplateId);
}
