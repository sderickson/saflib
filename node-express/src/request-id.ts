import crypto from "crypto";

export function generateRequestId() {
  // Generate 16 random bytes
  const randomBytes = crypto.randomBytes(16);

  // Set version (4) and variant bits according to RFC 4122
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // version 4
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // variant 1

  // Convert to hex string with proper formatting
  return [
    randomBytes.toString("hex", 0, 4),
    randomBytes.toString("hex", 4, 6),
    randomBytes.toString("hex", 6, 8),
    randomBytes.toString("hex", 8, 10),
    randomBytes.toString("hex", 10, 16),
  ].join("-");
}
