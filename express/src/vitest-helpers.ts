import { signAssertion } from "@saflib/node";

let mockCounter = 0;

export function makeUserHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `user${mockCounter}@example.com`,
  phone?: string,
): Record<string, string> {
  const h: Record<string, string> = {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-mfa-completed": "true",
    "x-user-is-admin": "false",
    "x-requested-with": "XMLHttpRequest",
  };
  if (phone) {
    h["x-user-phone"] = phone;
  }
  return h;
}

export function makeAdminHeaders(
  userId: string = `${mockCounter++}`,
  email: string = `admin${mockCounter}@example.com`,
): Record<string, string> {
  return {
    "x-user-id": userId,
    "x-user-email": email,
    "x-user-email-verified": "true",
    "x-user-is-admin": "true",
    "x-user-mfa-completed": "true",
    "x-requested-with": "XMLHttpRequest",
  };
}

/**
 * Signs an identity assertion for use in tests via `X-Saf-Identity-Assertion`.
 *
 * Requires `SAF_INTERNAL_ASSERTION_KEYS` to be set (e.g. via `vi.stubEnv` in
 * test setup) to a value like `test:dGVzdC1zZWNyZXQ=`.
 */
export function makeAssertionHeaders(
  user: { userId: string; mfaCompleted?: boolean },
  options: {
    operationId: string;
    requestId?: string;
    claims?: Record<string, string>;
  },
): Record<string, string> {
  const issuedAt = Date.now();
  const token = signAssertion({
    userId: user.userId,
    targetOperationId: options.operationId,
    requestId: options.requestId,
    mfaCompleted: user.mfaCompleted,
    claims: options.claims,
    issuedAt,
    expiresAt: issuedAt + 30_000,
  });
  return {
    "x-saf-identity-assertion": token,
  };
}
