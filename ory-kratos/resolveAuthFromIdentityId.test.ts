import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAuthFromIdentityId } from "./resolveAuthFromIdentityId.ts";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("resolveAuthFromIdentityId", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch");
    vi.stubEnv("KRATOS_ADMIN_API_URL", "http://kratos:4434");
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns Auth for an active user", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        id: "user-1",
        state: "active",
        traits: { email: "user@example.com", phone: "+15551212" },
        verifiable_addresses: [{ via: "email", verified: true }],
      }),
    );

    const auth = await resolveAuthFromIdentityId("user-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://kratos:4434/admin/identities/user-1",
      { headers: { Accept: "application/json" } },
    );
    expect(auth).toEqual({
      userId: "user-1",
      userEmail: "user@example.com",
      userPhone: "+15551212",
      isAdmin: false,
      emailVerified: true,
    });
    expect(auth).not.toHaveProperty("mfaCompleted");
  });

  it("returns null for an inactive user", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        id: "user-2",
        state: "inactive",
        traits: { email: "user@example.com" },
        verifiable_addresses: [{ via: "email", verified: true }],
      }),
    );

    expect(await resolveAuthFromIdentityId("user-2")).toBeNull();
  });

  it("returns null for a missing user (404)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(404, { error: "Not Found" }),
    );

    expect(await resolveAuthFromIdentityId("missing")).toBeNull();
  });

  it("sets isAdmin for a verified admin-email user", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        id: "admin-1",
        state: "active",
        traits: { email: "admin@example.com" },
        verifiable_addresses: [{ via: "email", verified: true }],
      }),
    );

    const auth = await resolveAuthFromIdentityId("admin-1");

    expect(auth).toEqual({
      userId: "admin-1",
      userEmail: "admin@example.com",
      userPhone: undefined,
      isAdmin: true,
      emailVerified: true,
    });
  });

  it("throws on network errors (transient, not unresolvable)", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new TypeError("fetch failed"),
    );

    await expect(resolveAuthFromIdentityId("user-1")).rejects.toThrow(
      "fetch failed",
    );
  });

  it("throws on non-404 error statuses (transient, not unresolvable)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(503, { error: "unavailable" }),
    );

    await expect(resolveAuthFromIdentityId("user-1")).rejects.toThrow(
      "Kratos admin identity lookup failed: 503",
    );
  });

  it("does not set isAdmin when admin email is unverified", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        id: "admin-2",
        state: "active",
        traits: { email: "admin@example.com" },
        verifiable_addresses: [{ via: "email", verified: false }],
      }),
    );

    const auth = await resolveAuthFromIdentityId("admin-2");

    expect(auth).toMatchObject({
      isAdmin: false,
      emailVerified: false,
    });
  });
});
