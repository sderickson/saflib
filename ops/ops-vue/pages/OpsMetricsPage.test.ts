import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import OpsMetricsAsync from "./OpsMetricsAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";
const queries: string[] = [];
const graphQueries: string[] = [];

describe("OpsMetricsAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/metrics/query`, ({ request }) => {
      const q = new URL(request.url).searchParams.get("query")!;
      queries.push(q);
      if (q.startsWith("bad")) {
        return HttpResponse.json({ message: "PromQL error: parse error" }, { status: 400 });
      }
      if (q.includes("node_memory")) {
        return HttpResponse.json({ metrics: { result_type: "vector", result: [{ metric: { saf_app: "host", instance: "x" }, value: [1, "49.68"] }] } });
      }
      return HttpResponse.json({
        metrics: {
          result_type: "vector",
          result: [
            { metric: { path: "/ops/digest" }, value: [1, "2"] },
            { metric: { path: "/ops/health" }, value: [1, "12"] },
          ],
        },
      });
    }),
    http.post(`${API}/ops/metrics/graph-links`, async ({ request }) => {
      const body = (await request.json()) as { query: string };
      graphQueries.push(body.query);
      return HttpResponse.json({ graph_link: { svg_url: "http://x/g.svg", png_url: "http://x/g.png", start: "", end: "", step: 300 } });
    }),
  ]);

  it("runs presets and custom PromQL, with a graph and a table of current values", async () => {
    await router.push("/ops/metrics");
    const wrapper = mountTestApp(OpsMetricsAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=metric-row]")).toHaveLength(2));
    // Sorted by value, labelled without the scrape's identity labels.
    const rows = wrapper.findAll("[data-test=metric-row]");
    expect(rows[0]!.text()).toContain("path=/ops/health");
    await vi.waitFor(() => expect(graphQueries.length).toBeGreaterThan(0));

    const memory = wrapper.findAll("[data-test=metric-preset]").find((c) => c.text() === "Memory available %")!;
    await memory.trigger("click");
    await vi.waitFor(() => expect(wrapper.find("[data-test=metric-row]").text()).toContain("49.68%"));
    expect(router.currentRoute.value.query.q).toContain("node_memory");

    await wrapper.find("[data-test=metric-query] textarea").setValue("bad(");
    await wrapper.find("[data-test=metric-run]").trigger("click");
    await vi.waitFor(() => expect(wrapper.find("[data-test=metric-error]").text()).toContain("parse error"));
    wrapper.unmount();
  });
});
