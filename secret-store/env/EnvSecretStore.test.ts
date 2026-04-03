import { afterEach, describe, expect, it } from "vitest";
import { EnvSecretNotFoundError } from "../errors.ts";
import { EnvSecretStore } from "./EnvSecretStore.ts";

describe("EnvSecretStore", () => {
  const key = "ENV_SECRET_STORE_TEST_KEY";

  afterEach(() => {
    delete process.env[key];
  });

  it("returns trimmed value when set", async () => {
    process.env[key] = "  hello  ";
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(key);
    expect(error).toBeUndefined();
    expect(result).toBe("hello");
  });

  it("errors when missing", async () => {
    const store = new EnvSecretStore();
    const { result, error } = await store.getSecretByName(key);
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(EnvSecretNotFoundError);
  });

  it("errors when empty or whitespace", async () => {
    const store = new EnvSecretStore();
    process.env[key] = "";
    let out = await store.getSecretByName(key);
    expect(out.error).toBeInstanceOf(EnvSecretNotFoundError);
    process.env[key] = "   ";
    out = await store.getSecretByName(key);
    expect(out.error).toBeInstanceOf(EnvSecretNotFoundError);
  });
});
