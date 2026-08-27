import { describe, expect, it } from "vitest";
import { createSecretStore } from "./createSecretStore.ts";
import { EnvSecretStore } from "./env/EnvSecretStore.ts";

describe("createSecretStore", () => {
  it("returns EnvSecretStore for type env", () => {
    const store = createSecretStore({ type: "env" });
    expect(store).toBeInstanceOf(EnvSecretStore);
  });
});
