/** Returned as JSON `code` on 403 from auth middleware when email is not verified. */
export const AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED =
  "EMAIL_VERIFICATION_REQUIRED" as const;

/** Returned as JSON `code` on 403 when the route requires MFA (AAL2+) and the session does not. */
export const AUTH_ERROR_MFA_REQUIRED = "MFA_REQUIRED" as const;

export type AuthGateErrorCode =
  | typeof AUTH_ERROR_EMAIL_VERIFICATION_REQUIRED
  | typeof AUTH_ERROR_MFA_REQUIRED;
