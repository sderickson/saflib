import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchKratosIdentitiesByIds,
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

describe("fetchKratosIdentitiesByIds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const uuid = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("dedupes, skips non-uuid ids, and chunks requests", async () => {
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos.test");
    const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        new URL(url).searchParams.getAll("ids").map((id) => ({ id })),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const ids = [
      ...Array.from({ length: 150 }, (_, i) => uuid(i)),
      uuid(0),
      "ops_token:abc",
    ];
    const result = await fetchKratosIdentitiesByIds(ids);

    expect(result.ok).toBe(true);
    expect(result.ok && result.identities).toHaveLength(150);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("page_size=100");
  });

  it("reports the status when Kratos fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchKratosIdentitiesByIds([uuid(1)])).resolves.toEqual({
      ok: false,
      status: 503,
    });
  });

  it("makes no request when no id could be a Kratos id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchKratosIdentitiesByIds(["system"])).resolves.toEqual({
      ok: true,
      identities: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
