import { createHmac, timingSafeEqual } from "node:crypto";
import { typedEnv } from "../env.ts";

/** Maximum assertion lifetime: 60 seconds. Enforced at both sign and verify. */
const MAX_TTL_MS = 60_000;

export interface IdentityAssertion {
  /** Whose authority the assertion carries. */
  userId: string;
  /** OpenAPI operationId this assertion is valid for. */
  targetOperationId: string;
  /** Caller's request id (propagated for logging/lineage). */
  requestId?: string;
  /** Snapshot of MFA completion from the originating context. */
  mfaCompleted?: boolean;
  /** Epoch milliseconds when the assertion was issued. */
  issuedAt: number;
  /** Epoch milliseconds when the assertion expires. */
  expiresAt: number;
  /** Extension point; M2 binds jobId + attempt here. */
  claims?: Record<string, string>;
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export class AssertionMalformedError extends AssertionError {
  constructor(message = "Malformed identity assertion token") {
    super(message);
    this.name = "AssertionMalformedError";
  }
}

export class AssertionSignatureError extends AssertionError {
  constructor(message = "Invalid identity assertion signature") {
    super(message);
    this.name = "AssertionSignatureError";
  }
}

export class AssertionExpiredError extends AssertionError {
  constructor(message = "Identity assertion has expired") {
    super(message);
    this.name = "AssertionExpiredError";
  }
}

export class AssertionUnknownKeyError extends AssertionError {
  constructor(message = "Unknown identity assertion keyId") {
    super(message);
    this.name = "AssertionUnknownKeyError";
  }
}

export class AssertionTtlExceededError extends AssertionError {
  constructor(
    message = `Identity assertion TTL exceeds maximum of ${MAX_TTL_MS / 1000}s`,
  ) {
    super(message);
    this.name = "AssertionTtlExceededError";
  }
}

export class AssertionKeysConfigError extends AssertionError {
  constructor(message: string) {
    super(message);
    this.name = "AssertionKeysConfigError";
  }
}

interface AssertionKey {
  keyId: string;
  secret: Buffer;
}

/**
 * When Infisical is mocked (`INFISICAL_TOKEN=mock`), the secret store returns
 * the placeholder `"mock"` for unset secrets. Treat that the same way other
 * integrations do: a fixed, non-secret key suitable for prod-local / playwright.
 * Format matches `keyId:base64secret` (`"mock-internal-assertion-secret"`).
 */
const MOCK_ASSERTION_KEYS =
  "mock:" + Buffer.from("mock-internal-assertion-secret").toString("base64");

/**
 * Parses `SAF_INTERNAL_ASSERTION_KEYS`: `keyId:base64secret[,keyId:base64secret]`.
 * The sentinel value `mock` expands to {@link MOCK_ASSERTION_KEYS}.
 */
function parseAssertionKeys(raw: string | undefined): AssertionKey[] {
  if (raw == null || raw.trim() === "") {
    throw new AssertionKeysConfigError(
      "SAF_INTERNAL_ASSERTION_KEYS is not set",
    );
  }

  const normalized = raw.trim() === "mock" ? MOCK_ASSERTION_KEYS : raw.trim();

  const keys: AssertionKey[] = [];
  for (const entry of normalized.split(",")) {
    const colon = entry.indexOf(":");
    if (colon <= 0 || colon === entry.length - 1) {
      throw new AssertionKeysConfigError(
        `Invalid SAF_INTERNAL_ASSERTION_KEYS entry: expected keyId:base64secret, got ${JSON.stringify(entry)}`,
      );
    }
    const keyId = entry.slice(0, colon);
    const secret = Buffer.from(entry.slice(colon + 1), "base64");
    if (secret.length === 0) {
      throw new AssertionKeysConfigError(
        `Invalid SAF_INTERNAL_ASSERTION_KEYS entry: empty secret for keyId ${JSON.stringify(keyId)}`,
      );
    }
    keys.push({ keyId, secret });
  }

  if (keys.length === 0) {
    throw new AssertionKeysConfigError(
      "SAF_INTERNAL_ASSERTION_KEYS contains no keys",
    );
  }

  return keys;
}

function assertTtl(assertion: IdentityAssertion): void {
  const ttl = assertion.expiresAt - assertion.issuedAt;
  if (ttl > MAX_TTL_MS) {
    throw new AssertionTtlExceededError();
  }
}

function hmacBase64url(secret: Buffer, payloadJson: string): string {
  return createHmac("sha256", secret)
    .update(payloadJson, "utf8")
    .digest("base64url");
}

function signaturesEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Signs an identity assertion.
 *
 * Token format: `base64url(JSON payload).base64url(hmac-sha256).keyId`
 * Signs with the first key in `SAF_INTERNAL_ASSERTION_KEYS`.
 * Throws if TTL (`expiresAt - issuedAt`) exceeds 60s.
 */
export function signAssertion(assertion: IdentityAssertion): string {
  assertTtl(assertion);

  const keys = parseAssertionKeys(typedEnv.SAF_INTERNAL_ASSERTION_KEYS);
  const { keyId, secret } = keys[0];

  const payloadJson = JSON.stringify(assertion);
  const payloadB64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const signatureB64 = hmacBase64url(secret, payloadJson);

  return `${payloadB64}.${signatureB64}.${keyId}`;
}

/**
 * Verifies an identity assertion token against any configured key.
 *
 * Throws typed errors on bad signature, expiry, unknown keyId, TTL > 60s,
 * or malformed token.
 */
export function verifyAssertion(token: string): IdentityAssertion {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AssertionMalformedError(
      "Identity assertion token must have exactly three segments",
    );
  }

  const [payloadB64, signatureB64, keyId] = parts;
  if (!payloadB64 || !signatureB64 || !keyId) {
    throw new AssertionMalformedError();
  }

  const keys = parseAssertionKeys(typedEnv.SAF_INTERNAL_ASSERTION_KEYS);
  const key = keys.find((k) => k.keyId === keyId);
  if (!key) {
    throw new AssertionUnknownKeyError(
      `Unknown identity assertion keyId: ${JSON.stringify(keyId)}`,
    );
  }

  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    throw new AssertionMalformedError(
      "Identity assertion payload is not valid base64url",
    );
  }

  const expectedSig = hmacBase64url(key.secret, payloadJson);
  if (!signaturesEqual(signatureB64, expectedSig)) {
    throw new AssertionSignatureError();
  }

  let assertion: IdentityAssertion;
  try {
    assertion = JSON.parse(payloadJson) as IdentityAssertion;
  } catch {
    throw new AssertionMalformedError(
      "Identity assertion payload is not valid JSON",
    );
  }

  if (
    typeof assertion.userId !== "string" ||
    typeof assertion.targetOperationId !== "string" ||
    typeof assertion.issuedAt !== "number" ||
    typeof assertion.expiresAt !== "number"
  ) {
    throw new AssertionMalformedError(
      "Identity assertion payload is missing required fields",
    );
  }

  assertTtl(assertion);

  if (Date.now() > assertion.expiresAt) {
    throw new AssertionExpiredError();
  }

  return assertion;
}
