import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchKratosIdentityById,
  kratosAdminBaseUrl,
  resolveEmailFromIdentityId,
  resolveUserIdByEmail,
} from "./kratos-admin.ts";

describe("kratosAdminBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("strips a trailing slash and uses the env default", () => {
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos:4434/");
    expect(kratosAdminBaseUrl()).toBe("http://kratos:4434");
  });
});

describe("resolveUserIdByEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the first matching identity id", async () => {
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "user-1" }],
      }),
    );

    await expect(resolveUserIdByEmail("Ada@Example.com")).resolves.toBe(
      "user-1",
    );
    expect(fetch).toHaveBeenCalledWith(
      "http://kratos.test/admin/identities?credentials_identifier=ada%40example.com",
      { headers: { Accept: "application/json" } },
    );
  });

  it("returns null when the lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(resolveUserIdByEmail("a@b.com")).resolves.toBeNull();
  });
});

describe("fetchKratosIdentityById / resolveEmailFromIdentityId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns identity JSON on success", async () => {
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "user-1",
          traits: { email: "a@b.com" },
        }),
      }),
    );

    await expect(fetchKratosIdentityById("user-1")).resolves.toEqual({
      ok: true,
      identity: { id: "user-1", traits: { email: "a@b.com" } },
    });
    await expect(resolveEmailFromIdentityId("user-1")).resolves.toBe("a@b.com");
  });

  it("returns status on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await expect(fetchKratosIdentityById("missing")).resolves.toEqual({
      ok: false,
      status: 404,
    });
    await expect(resolveEmailFromIdentityId("missing")).resolves.toBeNull();
  });
});
