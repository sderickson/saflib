import { describe, it, expect, vi } from "vitest";
import { h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { mountWithPlugins, stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { kratosSessionLoggedInHandler } from "@saflib/ory-kratos-sdk/fakes";
import AdminLayout from "./AdminLayout.vue";
import type { AdminNavGroup } from "./admin-nav.ts";

const groups: AdminNavGroup[] = [
  { items: [{ subdomain: "admin", path: "/", name: "Overview", badge: 2 }] },
  {
    label: "System",
    items: [{ subdomain: "admin", path: "/ops-issues", name: "Issues" }],
  },
  { label: "Dev", tag: "local only", items: [] },
];

describe("AdminLayout", () => {
  stubGlobals();
  setupMockServer([kratosSessionLoggedInHandler]);

  it("renders labelled groups, badges, and skips empty groups", async () => {
    const Page = { render: () => h("div", "page") };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: Page },
        { path: "/ops-issues", component: Page },
      ],
    });
    const wrapper = mountWithPlugins(
      { render: () => h(AdminLayout, { groups }, () => h("p", "content")) },
      {},
      { router },
    );
    await vi.waitUntil(() => wrapper.text().includes("Issues"));
    const text = wrapper.text();
    expect(text).toContain("Overview");
    expect(text).toContain("System");
    expect(text).toContain("2");
    expect(text).toContain("content");
    expect(text).not.toContain("local only");
  });
});
