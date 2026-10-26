import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecretManifest } from "@saflib/secret-store";
import { InfisicalSecretStore } from "./InfisicalSecretStore.ts";
import { InfisicalUnauthorizedError } from "./errors.ts";

const key = "INFISICAL_MOCK_SECRET_KEY";
const manifest: SecretManifest = [
  { name: key, description: "InfisicalSecretStore unit test key." },
];

describe("InfisicalSecretStore (mock token)", () => {
  afterEach(() => {
    delete process.env[key];
  });

  it("uses mock placeholder when env not set", async () => {
    const store = new InfisicalSecretStore({
      accessToken: "mock",
      projectId: "p",
      environment: "dev",
    });
    const { result, error } = await store.getSecretByName(key, manifest);
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
    const { result, error } = await store.getSecretByName(key, manifest);
    expect(error).toBeUndefined();
    expect(result).toBe("from-env");
  });
});

const sdkMock = vi.hoisted(() => {
  const state = {
    loginCalls: 0,
    loginShouldFail: false,
    /** Token issued by the most recent login; getSecret rejects stale ones. */
    validToken: "",
    getSecretCalls: 0,
  };
  class FakeInfisicalSDK {
    token = "";
    auth() {
      return {
        accessToken: (token: string) => {
          this.token = token;
          return this;
        },
        universalAuth: {
          login: async (_creds: { clientId: string; clientSecret: string }) => {
            state.loginCalls += 1;
            await Promise.resolve();
            if (state.loginShouldFail) {
              throw new Error("[StatusCode=401] invalid client secret");
            }
            this.token = `token-${state.loginCalls}`;
            state.validToken = this.token;
            return this;
          },
        },
      };
    }
    secrets() {
      return {
        getSecret: async ({ secretName }: { secretName: string }) => {
          state.getSecretCalls += 1;
          if (this.token !== state.validToken) {
            throw new Error("[StatusCode=401] token expired");
          }
          return { secretValue: `${secretName}-value` };
        },
      };
    }
  }
  return { state, FakeInfisicalSDK };
});

vi.mock("@infisical/sdk", () => ({
  InfisicalSDK: sdkMock.FakeInfisicalSDK,
}));

describe("InfisicalSecretStore (universal auth)", () => {
  const state = sdkMock.state;

  beforeEach(() => {
    state.loginCalls = 0;
    state.loginShouldFail = false;
    state.validToken = "";
    state.getSecretCalls = 0;
  });

  function makeStore() {
    return new InfisicalSecretStore({
      universalAuth: { clientId: "id", clientSecret: "secret" },
      projectId: "p",
      environment: "prod",
    });
  }

  it("logs in on first fetch and reuses the token", async () => {
    const store = makeStore();
    expect(state.loginCalls).toBe(0);
    expect((await store.getSecretByName(key, manifest)).result).toBe(
      `${key}-value`,
    );
    expect((await store.getSecretByName(key, manifest)).result).toBe(
      `${key}-value`,
    );
    expect(state.loginCalls).toBe(1);
  });

  it("shares one login across concurrent fetches", async () => {
    const store = makeStore();
    const results = await Promise.all([
      store.getSecretByName(key, manifest),
      store.getSecretByName(key, manifest),
      store.getSecretByName(key, manifest),
    ]);
    expect(results.every((r) => r.result === `${key}-value`)).toBe(true);
    expect(state.loginCalls).toBe(1);
  });

  it("logs in again and retries once when the token is rejected", async () => {
    const store = makeStore();
    await store.getSecretByName(key, manifest);
    state.validToken = "rotated"; // current token now expired
    const { result, error } = await store.getSecretByName(key, manifest);
    expect(error).toBeUndefined();
    expect(result).toBe(`${key}-value`);
    expect(state.loginCalls).toBe(2);
  });

  it("returns an unauthorized error without looping when login fails", async () => {
    state.loginShouldFail = true;
    const store = makeStore();
    const { result, error } = await store.getSecretByName(key, manifest);
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(InfisicalUnauthorizedError);
    expect(state.loginCalls).toBe(2);
    expect(state.getSecretCalls).toBe(0);

    // A later fetch tries again rather than reusing the failed login.
    state.loginShouldFail = false;
    expect((await store.getSecretByName(key, manifest)).result).toBe(
      `${key}-value`,
    );
  });
});
