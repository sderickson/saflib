import { describe, expect, it } from "vitest";
import { isSecretDeclared, type SecretManifest } from "./secrets-manifest.ts";
import { SecretNotDeclaredError } from "./errors.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";

const manifest: SecretManifest = [
  {
    name: "EXAMPLE_SECRET",
    description: "Used in unit tests.",
  },
];

describe("isSecretDeclared", () => {
  it("returns true for declared names", () => {
    expect(isSecretDeclared("EXAMPLE_SECRET", manifest)).toBe(true);
  });

  it("returns false for undeclared names", () => {
    expect(isSecretDeclared("OTHER", manifest)).toBe(false);
  });
});

describe("SecretStore.getSecretByName manifest check", () => {
  it("rejects undeclared names before fetching", async () => {
    process.env.UNDECLARED = "value";
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(
      "UNDECLARED",
      manifest,
    );
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(SecretNotDeclaredError);
    delete process.env.UNDECLARED;
  });

  it("fetches when the name is declared", async () => {
    process.env.EXAMPLE_SECRET = "ok";
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(
      "EXAMPLE_SECRET",
      manifest,
    );
    expect(error).toBeUndefined();
    expect(result).toBe("ok");
    delete process.env.EXAMPLE_SECRET;
  });
});
