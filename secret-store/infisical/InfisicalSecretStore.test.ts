import { afterEach, describe, expect, it } from "vitest";
import { InfisicalSecretStore } from "./InfisicalSecretStore.ts";

describe("InfisicalSecretStore (mock token)", () => {
  const key = "INFISICAL_MOCK_SECRET_KEY";

  afterEach(() => {
    delete process.env[key];
  });

  it("uses mock placeholder when env not set", async () => {
    const store = new InfisicalSecretStore({
      accessToken: "mock",
      projectId: "p",
      environment: "dev",
    });
    const { result, error } = await store.getSecretByName(key);
    expect(error).toBeUndefined();
    expect(result).toBe("mock");
  });

  it("prefers process.env when set", async () => {
    process.env[key] = "from-env";
    const store = new InfisicalSecretStore({
      accessToken: "mock",
      projectId: "p",
      environment: "dev",
    });
    const { result, error } = await store.getSecretByName(key);
    expect(error).toBeUndefined();
    expect(result).toBe("from-env");
  });
});
