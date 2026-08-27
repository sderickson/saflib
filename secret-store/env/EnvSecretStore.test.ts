import { afterEach, describe, expect, it } from "vitest";
import { EnvSecretNotFoundError } from "../errors.ts";
import type { SecretManifest } from "../secrets-manifest.ts";
import { EnvSecretStore } from "./EnvSecretStore.ts";

const key = "ENV_SECRET_STORE_TEST_KEY";
const manifest: SecretManifest = [
  { name: key, description: "EnvSecretStore unit test key." },
];

describe("EnvSecretStore", () => {
  afterEach(() => {
    delete process.env[key];
  });

  it("returns trimmed value when set", async () => {
    process.env[key] = "  hello  ";
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(key, manifest);
    expect(error).toBeUndefined();
    expect(result).toBe("hello");
  });

  it("errors when missing", async () => {
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(key, manifest);
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(EnvSecretNotFoundError);
  });

  it("errors when empty or whitespace", async () => {
    const store = new EnvSecretStore();
    process.env[key] = "";
    let out = await store.getSecretByName(key, manifest);
    expect(out.error).toBeInstanceOf(EnvSecretNotFoundError);
    process.env[key] = "   ";
    out = await store.getSecretByName(key, manifest);
    expect(out.error).toBeInstanceOf(EnvSecretNotFoundError);
  });
});
