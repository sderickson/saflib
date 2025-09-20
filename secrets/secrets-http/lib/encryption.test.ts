import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import {
  upsertSecretEncryptionKey,
  encryptSecret,
  decryptSecret,
} from "./encryption.js";

const TEST_KEY_PATH = "data/encryption-key.txt";

describe("upsertSecretEncryptionKey", () => {
  beforeEach(() => {
    // Clean up any existing key file
    if (existsSync(TEST_KEY_PATH)) {
      rmSync(TEST_KEY_PATH);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_KEY_PATH)) {
      rmSync(TEST_KEY_PATH);
    }
  });

  it("should return consistent key in test environment", () => {
    // This test runs in test environment (NODE_ENV=test), so should return hardcoded key
    const key1 = upsertSecretEncryptionKey();
    const key2 = upsertSecretEncryptionKey();

    expect(key1).toBe(key2);
    expect(key1).toBe(
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    expect(key1).toHaveLength(64); // 32 bytes as hex string
  });

  it("should create and return new key if file doesn't exist", () => {
    // Mock NODE_ENV to be not test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      const key = upsertSecretEncryptionKey();

      expect(key).toHaveLength(64); // 32 bytes as hex string
      expect(existsSync(TEST_KEY_PATH)).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should return existing key if file exists", () => {
    // Mock NODE_ENV to be not test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    try {
      // Create a key file first
      const existingKey =
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
      writeFileSync(TEST_KEY_PATH, existingKey, "utf8");

      const retrievedKey = upsertSecretEncryptionKey();

      expect(retrievedKey).toBe(existingKey);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe("encryptSecret and decryptSecret", () => {
  const testKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const testValue = "my-secret-value";

  it("should encrypt and decrypt successfully", () => {
    const encrypted = encryptSecret(testKey, testValue);
    const decrypted = decryptSecret(testKey, encrypted);

    expect(decrypted).toBe(testValue);
    expect(encrypted).not.toBe(testValue); // Should be encrypted
  });

  it("should produce different encrypted values for same input", () => {
    const encrypted1 = encryptSecret(testKey, testValue);
    const encrypted2 = encryptSecret(testKey, testValue);

    expect(encrypted1).not.toBe(encrypted2); // Different due to random IV

    // But both should decrypt to the same value
    expect(decryptSecret(testKey, encrypted1)).toBe(testValue);
    expect(decryptSecret(testKey, encrypted2)).toBe(testValue);
  });

  it("should throw error on invalid encrypted data", () => {
    expect(() => {
      decryptSecret(testKey, "invalid-base64-data");
    }).toThrow("Failed to decrypt secret");

    expect(() => {
      decryptSecret(testKey, "dGVzdA=="); // "test" in base64, but not valid encrypted data
    }).toThrow("Failed to decrypt secret");
  });

  it("should throw error on wrong key", () => {
    const encrypted = encryptSecret(testKey, testValue);
    const wrongKey =
      "1111111111111111111111111111111111111111111111111111111111111111";

    expect(() => {
      decryptSecret(wrongKey, encrypted);
    }).toThrow("Failed to decrypt secret");
  });

  it("should handle empty string", () => {
    const encrypted = encryptSecret(testKey, "");
    const decrypted = decryptSecret(testKey, encrypted);

    expect(decrypted).toBe("");
  });

  it("should handle unicode characters", () => {
    const unicodeValue = "🔒 Secret with émojis and ümlauts 中文";
    const encrypted = encryptSecret(testKey, unicodeValue);
    const decrypted = decryptSecret(testKey, encrypted);

    expect(decrypted).toBe(unicodeValue);
  });
});

describe("integration test", () => {
  it("should encrypt a value, then decrypt it to get original value back", () => {
    const originalValue =
      "This is a secret value with special chars: !@#$%^&*()_+{}|:<>?";
    const key = upsertSecretEncryptionKey();

    // Encrypt
    const encrypted = encryptSecret(key, originalValue);
    expect(encrypted).not.toBe(originalValue);
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/); // Should be base64

    // Decrypt
    const decrypted = decryptSecret(key, encrypted);
    expect(decrypted).toBe(originalValue);
  });
});
