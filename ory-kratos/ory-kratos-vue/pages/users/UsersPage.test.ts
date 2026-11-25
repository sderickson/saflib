import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { createMemoryHistory, createRouter } from "vue-router";
import { flushPromises } from "@vue/test-utils";
import { mountWithPlugins, stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import UsersPage from "./UsersPage.vue";
import { resetIdentityLoaderForTests } from "../../requests/identities.ts";

const API = "http://api.localhost:3000";
const ADA = "00000000-0000-4000-8000-000000000001";
const GRACE = "00000000-0000-4000-8000-000000000002";

const record = (id: string, name: string, email: string, mfa: boolean) => ({
  id,
  name,
  email,
  org: "Analytical",
  role: "owner",
  verified: true,
  state: "active",
  created_at: "2026-10-30T00:00:00Z",
  mfa,
  last_sign_in_at: null,
});
const all = [record(GRACE, "Grace Hopper", "grace@example.com", false), record(ADA, "Ada Lovelace", "ada@example.com", true)];
const searches: string[] = [];
let lookups = 0;

describe("UsersPage", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/admin/identities`, ({ request }) => {
      const q = new URL(request.url).searchParams.get("q") ?? "";
      searches.push(q);
      const identities = all.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));
      return HttpResponse.json({ identities, next_cursor: null, total: identities.length });
    }),
    http.get(`${API}/admin/identities/:id`, ({ params }) =>
      HttpResponse.json({
        identity: all.find((r) => r.id === params.id),
        mfa_methods: ["totp"],
        active_sessions: 2,
      }),
    ),
    http.post(`${API}/admin/identities/lookup`, () => {
      lookups++;
      return HttpResponse.json({ identities: [] });
    }),
  ]);

  beforeEach(() => {
    searches.length = 0;
    lookups = 0;
    resetIdentityLoaderForTests();
  });

  async function mountAt(path: string) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/users", component: UsersPage }],
    });
    await router.push(path);
    const wrapper = mountWithPlugins(UsersPage, {}, { router });
    return { wrapper, router };
  }

  it("lists people without a lookup per row, and searches via the URL", async () => {
    const { wrapper, router } = await mountAt("/users");
    await vi.waitUntil(() => wrapper.findAll('[data-test="users-row"]').length === 2);
    expect(wrapper.text()).toContain("Ada Lovelace");
    expect(wrapper.text()).toContain("2 people");
    expect(lookups).toBe(0);

    await wrapper.find('[data-test="users-search"] input').setValue("ada");
    await vi.waitUntil(() => router.currentRoute.value.query.q === "ada", { timeout: 2000 });
    await vi.waitUntil(() => wrapper.findAll('[data-test="users-row"]').length === 1);
    expect(searches).toContain("ada");
  });

  it("opens the detail panel for ?id= and closes it", async () => {
    const { wrapper, router } = await mountAt(`/users?id=${ADA}`);
    await vi.waitUntil(() => wrapper.find('[data-test="user-detail"]').text().includes("Authenticator app"));
    const panel = wrapper.find('[data-test="user-detail"]');
    expect(panel.text()).toContain("Ada Lovelace");
    expect(panel.text()).toContain("Analytical");

    await panel.find('button[aria-label="Close"]').trigger("click");
    await flushPromises();
    await vi.waitUntil(() => router.currentRoute.value.query.id === undefined);
  });

  it("selects a row", async () => {
    const { wrapper, router } = await mountAt("/users");
    await vi.waitUntil(() => wrapper.findAll('[data-test="users-row"]').length === 2);
    await wrapper.findAll('[data-test="users-row"]')[1]!.trigger("click");
    await vi.waitUntil(() => router.currentRoute.value.query.id === ADA);
  });
});
