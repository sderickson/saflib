/**
 * Courier callbacks aligned with Ory Identities built-in email templates (valid flows only).
 * @see https://www.ory.com/docs/kratos/emails-sms/custom-email-templates
 */

export interface User {
  id: string;
  email: string;
  createdAt?: Date;
  lastLoginAt?: Date | null;
  /** For the recipient address: taken from the matching `verifiable_addresses` entry when present. */
  emailVerified?: boolean | null;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
}

/** Canonical IDs use dots, e.g. `verification_code.valid`. */
export type KratosCourierTemplateId =
  | "recovery_code.valid"
  | "recovery.valid"
  | "verification_code.valid"
  | "verification.valid"
  | "login_code.valid"
  | "registration_code.valid";

export interface BaseKratosCourierPayload {
  recipient: string;
  user: User;
  /** Original `template_data` from the HTTP courier body. */
  templateData: Record<string, unknown>;
}

export interface RecoveryCodeValidPayload extends BaseKratosCourierPayload {
  recoveryCode: string;
  expiresInMinutes?: number;
}

export interface RecoveryValidPayload extends BaseKratosCourierPayload {
  recoveryUrl: string;
}

export interface VerificationCodeValidPayload extends BaseKratosCourierPayload {
  verificationCode: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
}

export interface VerificationValidPayload extends BaseKratosCourierPayload {
  verificationUrl: string;
}

export interface LoginCodeValidPayload extends BaseKratosCourierPayload {
  loginCode: string;
  loginUrl?: string;
  expiresInMinutes?: number;
}

export interface RegistrationCodeValidPayload extends BaseKratosCourierPayload {
  registrationCode: string;
  registrationUrl?: string;
  expiresInMinutes?: number;
}

/**
 * Hooks for each supported **valid** template type. Unsupported / invalid templates are rejected before dispatch.
 */
export interface KratosCourierCallbacks {
  onRecoveryCodeValid?: (payload: RecoveryCodeValidPayload) => Promise<void>;
  onRecoveryValid?: (payload: RecoveryValidPayload) => Promise<void>;
  onVerificationCodeValid?: (
    payload: VerificationCodeValidPayload,
  ) => Promise<void>;
  onVerificationValid?: (payload: VerificationValidPayload) => Promise<void>;
  onLoginCodeValid?: (payload: LoginCodeValidPayload) => Promise<void>;
  onRegistrationCodeValid?: (
    payload: RegistrationCodeValidPayload,
  ) => Promise<void>;
}
