import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssertionExpiredError,
  AssertionMalformedError,
  AssertionSignatureError,
  AssertionTtlExceededError,
  AssertionUnknownKeyError,
  type IdentityAssertion,
  signAssertion,
  verifyAssertion,
} from "./signAssertion.ts";

const OLD_SECRET = Buffer.from("old-test-secret-bytes!!").toString("base64");
const NEW_SECRET = Buffer.from("new-test-secret-bytes!!").toString("base64");
const OLD_KEY_ID = "old";
const NEW_KEY_ID = "new";

function makeAssertion(
  overrides: Partial<IdentityAssertion> = {},
): IdentityAssertion {
  const issuedAt = Date.now();
  return {
    userId: "user-123",
    targetOperationId: "getMatter",
    issuedAt,
    expiresAt: issuedAt + 30_000,
    ...overrides,
  };
}

function craftToken(
  assertion: IdentityAssertion,
  keyId: string,
  secretBase64: string,
): string {
  const payloadJson = JSON.stringify(assertion);
  const payloadB64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const signatureB64 = createHmac("sha256", Buffer.from(secretBase64, "base64"))
    .update(payloadJson, "utf8")
    .digest("base64url");
  return `${payloadB64}.${signatureB64}.${keyId}`;
}

describe("signAssertion / verifyAssertion", () => {
  beforeEach(() => {
    vi.stubEnv(
      "SAF_INTERNAL_ASSERTION_KEYS",
      `${OLD_KEY_ID}:${OLD_SECRET}`,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips sign then verify", () => {
    const assertion = makeAssertion({
      requestId: "req-1",
      mfaCompleted: true,
      claims: { jobId: "job-9" },
    });

    const token = signAssertion(assertion);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[2]).toBe(OLD_KEY_ID);

    expect(verifyAssertion(token)).toEqual(assertion);
  });

  it("signs with the first configured key", () => {
    vi.stubEnv(
      "SAF_INTERNAL_ASSERTION_KEYS",
      `${NEW_KEY_ID}:${NEW_SECRET},${OLD_KEY_ID}:${OLD_SECRET}`,
    );

    const token = signAssertion(makeAssertion());
    expect(token.split(".")[2]).toBe(NEW_KEY_ID);
    expect(verifyAssertion(token).userId).toBe("user-123");
  });

  it("verifies a token signed with a rotated-in second key", () => {
    const assertion = makeAssertion();
    const token = craftToken(assertion, OLD_KEY_ID, OLD_SECRET);

    vi.stubEnv(
      "SAF_INTERNAL_ASSERTION_KEYS",
      `${NEW_KEY_ID}:${NEW_SECRET},${OLD_KEY_ID}:${OLD_SECRET}`,
    );

    expect(verifyAssertion(token)).toEqual(assertion);
  });

  it("rejects a tampered payload", () => {
    const token = signAssertion(makeAssertion());
    const [payloadB64, signatureB64, keyId] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify(makeAssertion({ userId: "attacker" })),
      "utf8",
    ).toString("base64url");

    expect(() =>
      verifyAssertion(`${tamperedPayload}.${signatureB64}.${keyId}`),
    ).toThrow(AssertionSignatureError);
    // sanity: original payload segment still present in the forged token shape
    expect(payloadB64).not.toBe(tamperedPayload);
  });

  it("rejects an expired token", () => {
    const issuedAt = Date.now() - 40_000;
    const assertion = makeAssertion({
      issuedAt,
      expiresAt: issuedAt + 30_000, // expired 10s ago; TTL still ≤ 60s
    });
    const token = signAssertion(assertion);

    expect(() => verifyAssertion(token)).toThrow(AssertionExpiredError);
  });

  it("rejects an unknown keyId", () => {
    const token = signAssertion(makeAssertion());
    const [payloadB64, signatureB64] = token.split(".");

    expect(() =>
      verifyAssertion(`${payloadB64}.${signatureB64}.unknown-key`),
    ).toThrow(AssertionUnknownKeyError);
  });

  it("rejects TTL greater than 60s at sign", () => {
    const issuedAt = Date.now();
    expect(() =>
      signAssertion(
        makeAssertion({ issuedAt, expiresAt: issuedAt + 60_001 }),
      ),
    ).toThrow(AssertionTtlExceededError);
  });

  it("rejects TTL greater than 60s at verify", () => {
    const issuedAt = Date.now();
    const assertion = makeAssertion({
      issuedAt,
      expiresAt: issuedAt + 60_001,
    });
    const token = craftToken(assertion, OLD_KEY_ID, OLD_SECRET);

    expect(() => verifyAssertion(token)).toThrow(AssertionTtlExceededError);
  });

  it("rejects a malformed token", () => {
    expect(() => verifyAssertion("not-a-token")).toThrow(
      AssertionMalformedError,
    );
    expect(() => verifyAssertion("only.two")).toThrow(AssertionMalformedError);
    expect(() => verifyAssertion("a.b.c.d")).toThrow(AssertionMalformedError);
    expect(() => verifyAssertion("...")).toThrow(AssertionMalformedError);
  });
});
