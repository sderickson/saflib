import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import AnalyticsExploreAsync from "./AnalyticsExploreAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";
const sent: string[] = [];

describe("AnalyticsExploreAsync", () => {
  stubGlobals();
  setupMockServer([
    http.post(`${API}/ops/logs/query`, async ({ request }) => {
      const { sql } = (await request.json()) as { sql: string };
      sent.push(sql);
      if (sql.startsWith("DELETE")) {
        return HttpResponse.json({ message: "Only a single read-only query that returns rows is allowed" }, { status: 400 });
      }
      return HttpResponse.json({ columns: ["event", "n"], rows: [["signup", 3], ["login", null]], truncated: false, duration_ms: 4 });
    }),
  ]);

  it("runs a saved query from the URL, shows rows, and shows SQLite's error", async () => {
    await router.push("/analytics");
    const wrapper = mountTestApp(AnalyticsExploreAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=analytics-saved-query]").length).toBeGreaterThan(0));

    await wrapper.findAll("[data-test=analytics-saved-query]")[0]!.trigger("click");
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=analytics-row]")).toHaveLength(2));
    expect(router.currentRoute.value.query.q).toContain("FROM product_events");
    expect(wrapper.find("[data-test=analytics-result]").text()).toContain("2 rows");
    expect(wrapper.findAll("[data-test=analytics-row]")[1]!.text()).toContain("—");

    await wrapper.find("[data-test=analytics-sql] textarea").setValue("DELETE FROM log_entries");
    await wrapper.find("[data-test=analytics-run]").trigger("click");
    await vi.waitFor(() => expect(wrapper.find("[data-test=analytics-error]").text()).toContain("read-only"));
    expect(sent.at(-1)).toBe("DELETE FROM log_entries");
    wrapper.unmount();
  });
});
