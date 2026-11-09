import { createHash, randomBytes } from "node:crypto";

/** Every ops token starts with this, so secret scanners can recognize leaks. */
export const OPS_TOKEN_PREFIX = "safops_";

/** Characters of the secret (after the prefix) kept for display. */
export const OPS_TOKEN_DISPLAY_CHARS = 8;

/** A freshly minted token. `token` is the only copy of the plaintext. */
export interface MintedOpsToken {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
}

/** Mint a new token: the prefix plus 32 random bytes, base64url-encoded. */
export function mintOpsToken(): MintedOpsToken {
  const secret = randomBytes(32).toString("base64url");
  const token = `${OPS_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashOpsToken(token),
    tokenPrefix: secret.slice(0, OPS_TOKEN_DISPLAY_CHARS),
  };
}

/**
 * Hex SHA-256 of a token. Tokens carry 256 bits of randomness, so a fast hash
 * is enough: there is nothing to brute-force the way there is with passwords.
 */
export function hashOpsToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Cheap shape check before touching the database. */
export function looksLikeOpsToken(value: string): boolean {
  return /^safops_[A-Za-z0-9_-]{43}$/.test(value);
}
