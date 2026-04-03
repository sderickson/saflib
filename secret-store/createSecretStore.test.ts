import { describe, expect, it } from "vitest";
import { createSecretStore } from "./createSecretStore.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";
import { InfisicalSecretStore } from "./infisical/InfisicalSecretStore.ts";

describe("createSecretStore", () => {
  it("returns EnvSecretStore for type env", () => {
    const store = createSecretStore({ type: "env" });
    expect(store).toBeInstanceOf(EnvSecretStore);
  });

  it("returns InfisicalSecretStore for type infisical", () => {
    const store = createSecretStore({
      type: "infisical",
      options: {
        accessToken: "mock",
        projectId: "p",
        environment: "dev",
      },
    });
    expect(store).toBeInstanceOf(InfisicalSecretStore);
  });
});
