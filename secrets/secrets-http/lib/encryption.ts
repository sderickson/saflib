import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { typedEnv } from "@saflib/env";

const ENCRYPTION_KEY_PATH = "data/encryption-key.txt";
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 chars = 32 bytes hex

/**
 * Gets or creates the encryption key for secrets.
 * In test environment, returns a consistent hardcoded key.
 * Otherwise, creates a new random key if none exists, or returns the existing one.
 */
export function upsertSecretEncryptionKey(): string {
  // Use hardcoded key in test environment for consistency
  if (typedEnv.NODE_ENV === "test") {
    return TEST_KEY;
  }

  // Check if key file exists
  if (existsSync(ENCRYPTION_KEY_PATH)) {
    return readFileSync(ENCRYPTION_KEY_PATH, "utf8").trim();
  }

  // Generate new key
  const newKey = randomBytes(32).toString("hex");

  // Ensure data directory exists
  mkdirSync(dirname(ENCRYPTION_KEY_PATH), { recursive: true });

  // Store the key
  writeFileSync(ENCRYPTION_KEY_PATH, newKey, "utf8");

  return newKey;
}

/**
 * Encrypts a secret value using AES-256-GCM.
 * Returns base64 encoded string containing IV + authTag + encrypted data.
 */
export function encryptSecret(key: string, value: string): string {
  try {
    // Convert hex key to buffer
    const keyBuffer = Buffer.from(key, "hex");

    // Generate random IV (12 bytes for GCM)
    const iv = randomBytes(12);

    // Create cipher
    const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv);
    cipher.setAAD(Buffer.from("secret")); // Additional authenticated data

    // Encrypt
    let encrypted = cipher.update(value, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString("base64");
  } catch (error) {
    throw new Error(
      `Failed to encrypt secret: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decrypts a secret value using AES-256-GCM.
 * Expects base64 encoded string containing IV + authTag + encrypted data.
 */
export function decryptSecret(key: string, encryptedValue: string): string {
  try {
    // Convert hex key to buffer
    const keyBuffer = Buffer.from(key, "hex");

    // Decode base64
    const combined = Buffer.from(encryptedValue, "base64");

    // Extract components
    const iv = combined.subarray(0, 12); // First 12 bytes
    const authTag = combined.subarray(12, 28); // Next 16 bytes
    const encrypted = combined.subarray(28); // Rest is encrypted data

    // Create decipher
    const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv);
    decipher.setAAD(Buffer.from("secret")); // Same AAD used in encryption
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      `Failed to decrypt secret: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
