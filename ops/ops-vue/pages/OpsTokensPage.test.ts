import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { OpsRequestBody, OpsResponseBody, OpsTokenResponse } from "@saflib/ops-spec";
import OpsTokensAsync from "./OpsTokensAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const token = (overrides: Partial<OpsTokenResponse>): OpsTokenResponse => ({
  id: "t1",
  name: "maintenance agent",
  token_prefix: "AbCdEfGh",
  scopes: ["ops:read"],
  created_by: "admin-1",
  created_at: "2026-11-01T00:00:00.000Z",
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
  exchanged_from: null,
  ...overrides,
});

const listed: OpsResponseBody["listOpsTokens"][200] = {
  ops_tokens: [
    token({}),
    token({ id: "t2", name: "old laptop", revoked_at: "2026-11-02T00:00:00.000Z" }),
    token({
      id: "t4",
      name: "maintenance agent",
      exchanged_from: "t1",
      scopes: ["ops:read", "ops:triage"],
      expires_at: "2099-11-01T08:00:00.000Z",
      created_at: "2099-11-01T00:00:00.000Z",
    }),
  ],
};

const handlers = [
  http.get<PathParams, never, OpsResponseBody["listOpsTokens"][200]>(
    `${API}/admin/ops-tokens`,
    () => HttpResponse.json(listed),
  ),
];

describe("OpsTokensAsync", () => {
  stubGlobals();
  const server = setupMockServer(handlers);

  async function mount() {
    await router.push("/ops/tokens");
    const wrapper = mountTestApp(OpsTokensAsync, { attachTo: document.body });
    await vi.waitFor(() => {
      expect(wrapper.findComponent({ name: "v-data-table" }).exists()).toBe(true);
    });
    return wrapper;
  }

  const inBody = (sel: string) => document.body.querySelector<HTMLElement>(sel);

  it("shows only active tokens until All is picked", async () => {
    const wrapper = await mount();
    let rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).not.toContain("old laptop");
    await wrapper.find("[data-test=filter-all]").trigger("click");
    await vi.waitFor(() => expect(wrapper.findAll("tbody tr")).toHaveLength(3));
    rows = wrapper.findAll("tbody tr");
    expect(rows[1]!.text()).toContain("old laptop");
    wrapper.unmount();
  });

  it("lists tokens with their lifetime, a state chip only when not active, and revoke for active ones", async () => {
    const wrapper = await mount();
    await wrapper.find("[data-test=filter-all]").trigger("click");
    await vi.waitFor(() => expect(wrapper.findAll("tbody tr")).toHaveLength(3));
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.find("[data-test=token-state]").exists()).toBe(false);
    expect(rows[0]!.find("[data-test=token-lifetime] .v-icon").exists()).toBe(true); // ∞, no expiry
    expect(rows[0]!.find("[data-test=token-revoke]").classes()).not.toContain("saf-admin-action--off");
    expect(rows[1]!.find("[data-test=token-state]").text()).toBe("Revoked");
    // Revoked tokens keep the slot (icons line up) but can't be revoked again.
    expect(rows[1]!.find("[data-test=token-revoke]").classes()).toContain("saf-admin-action--off");
    expect(rows[2]!.find("[data-test=token-lifetime]").text()).toBe("8h");
    wrapper.unmount();
  });

  it("labels exchanged tokens", async () => {
    const wrapper = await mount();
    const rows = wrapper.findAll("tbody tr");
    expect(rows[0]!.find("[data-test=token-exchanged]").exists()).toBe(false);
    expect(rows[1]!.find("[data-test=token-exchanged]").text()).toBe("exchanged");
    wrapper.unmount();
  });

  it("creates a token and shows the secret once", async () => {
    let body: OpsRequestBody["createOpsToken"] | undefined;
    server.use(
      http.post<PathParams, OpsRequestBody["createOpsToken"], OpsResponseBody["createOpsToken"][201]>(
        `${API}/admin/ops-tokens`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json(
            { ops_token: token({ id: "t3", name: body.name }), token: "safops_secret-value" },
            { status: 201 },
          );
        },
      ),
    );
    const wrapper = await mount();
    await wrapper.find("[data-test=create-token]").trigger("click");
    await vi.waitFor(() => expect(inBody("[data-test=token-name] input")).toBeTruthy());
    const input = inBody("[data-test=token-name] input") as HTMLInputElement;
    input.value = "ci agent";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() =>
      expect((inBody("[data-test=submit-token]") as HTMLButtonElement).disabled).toBe(false),
    );
    inBody("[data-test=submit-token]")!.click();

    await vi.waitFor(() =>
      expect(inBody("[data-test=token-secret]")?.textContent).toContain("safops_secret-value"),
    );
    expect(body).toEqual({ name: "ci agent", scopes: ["ops:read"], expires_at: null });

    inBody("[data-test=secret-done]")!.click();
    await vi.waitFor(() => expect(inBody("[data-test=token-secret]")).toBeNull());
    wrapper.unmount();
  });

  it("revokes after confirmation", async () => {
    let revokedId: string | undefined;
    server.use(
      http.post<{ id: string }, Record<string, never>, OpsResponseBody["revokeOpsToken"][200]>(
        `${API}/admin/ops-tokens/:id/revoke`,
        ({ params }) => {
          revokedId = params.id;
          return HttpResponse.json({ ops_token: token({ revoked_at: new Date().toISOString() }) });
        },
      ),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = await mount();
    const revoke = wrapper.findAll("tbody tr")[0]!.findComponent({ name: "v-btn" });
    await revoke.trigger("click");
    await vi.waitFor(() => expect(revokedId).toBe("t1"));
    wrapper.unmount();
  });
});

describe("configureOpsVue", () => {
  stubGlobals();
  const seen: string[] = [];
  setupMockServer([
    http.get("http://hub.localhost:3000/admin/ops-tokens", ({ request }) => {
      seen.push(request.url);
      return HttpResponse.json({ ops_tokens: [] });
    }),
  ]);

  it("sends requests to the configured API subdomain", async () => {
    const { configureOpsVue, getClient } = await import("../client.ts");
    configureOpsVue({ apiSubdomain: "hub" });
    try {
      await getClient().GET("/admin/ops-tokens", {});
      expect(seen).toEqual(["http://hub.localhost:3000/admin/ops-tokens"]);
    } finally {
      configureOpsVue({ apiSubdomain: "api" });
    }
  });
});
