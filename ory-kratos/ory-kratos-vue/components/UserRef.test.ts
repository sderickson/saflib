import { describe, expect, it, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { h } from "vue";
import UserRef from "./UserRef.vue";
import { resetIdentityLoaderForTests } from "../requests/identities.ts";
import { mountTestApp } from "../test-app.ts";

const ADA = "00000000-0000-4000-8000-000000000001";
const GONE = "00000000-0000-4000-8000-000000000002";
const lookups: string[][] = [];

describe("UserRef", () => {
  stubGlobals();
  setupMockServer([
    http.post("http://api.localhost:3000/admin/identities/lookup", async ({ request }) => {
      const { ids } = (await request.json()) as { ids: string[] };
      lookups.push(ids);
      return HttpResponse.json({
        identities: ids
          .filter((id) => id === ADA)
          .map((id) => ({
            id,
            email: "ada@example.com",
            name: "Ada Lovelace",
            org: null,
            role: null,
            verified: true,
            state: "active",
            created_at: "2026-10-30T00:00:00Z",
          })),
      });
    }),
  ]);

  beforeEach(() => {
    lookups.length = 0;
    resetIdentityLoaderForTests();
  });

  it("shows names, marks deleted users, and batches the lookups", async () => {
    const wrapper = mountTestApp({
      render: () =>
        h("div", [
          h(UserRef, { id: ADA, variant: "full" }),
          h(UserRef, { id: ADA }),
          h(UserRef, { id: GONE }),
        ]),
    });
    await vi.waitUntil(() => wrapper.text().includes("Deleted user"));
    expect(wrapper.text()).toContain("Ada Lovelace");
    expect(wrapper.text()).toContain("ada@example.com");
    expect(wrapper.text()).toContain("AL");
    expect(lookups).toEqual([[ADA, GONE]]);
  });

  it("renders non-person ids as a ShortId without a lookup", async () => {
    const wrapper = mountTestApp(UserRef, { props: { id: "system" } });
    expect(wrapper.find('[data-test="short-id"]').text()).toBe("u·syst");
    expect(lookups).toEqual([]);
  });
});
