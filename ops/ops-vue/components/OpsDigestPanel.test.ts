import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import OpsDigestPanel from "./OpsDigestPanel.vue";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const digest = {
  since: "2026-11-08T10:00:00.000Z",
  generated_at: "2026-11-09T10:00:00.000Z",
  summary: { needs_attention: true, health_status: "warn", new_issues: 1, regressed_issues: 0, open_issues: 1, new_log_templates: 0, deploys: 2, boots: 3, firing_alerts: 1 },
  health: { status: "warn", failing: [{ name: "disk", status: "warn", summary: "15% free" }] },
  deploys: [],
  issues: { new: [{ id: "i1", level: "error", status: "open", untrusted: { title: "TypeError in checkout" } }], regressed: [], top: [] },
  logs: null,
  metrics: { window_seconds: 86400, requests: { current: 1200, previous: 1000 }, error_rate: { current: 0.001, previous: 0 }, p95_seconds: { current: 0.12, previous: 0.1 }, flags: [], error: null },
  dependencies: { checked_at: "2026-11-09T06:00:00.000Z", stale: false, advisories: { critical: 0, high: 2, moderate: 1, low: 0, unknown: 0 }, actionable: 2, outdated_direct: 9, renovate_due: 8, runtime_eol_soon: 0 },
  alerts: { firing: [{ id: "a1", alertname: "SafDiskAlmostFull", untrusted: { annotations: { summary: "Host disk is 85% full" } } }], firing_unacked: 1, fired_in_window: 1, pipeline_last_seen_at: "2026-11-09T09:58:00.000Z", pipeline_stale: false },
};

let graphLinks = 0;

describe("OpsDigestPanel", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/digest`, () => HttpResponse.json({ digest })),
    http.post(`${API}/ops/metrics/graph-links`, () => {
      graphLinks++;
      return HttpResponse.json({
        graph_link: { svg_url: "http://x/g.svg", png_url: `http://x/g${graphLinks}.png`, start: digest.since, end: digest.generated_at, step: 300 },
      });
    }),
  ]);

  it("summarizes what needs attention and shows graphs", async () => {
    const wrapper = mountTestApp(OpsDigestPanel, { props: { issuesTo: "/ops/issues", alertsTo: "/ops/alerts" } });
    await vi.waitFor(() => expect(wrapper.find("[data-test=digest-status]").exists()).toBe(true));
    const text = wrapper.text();
    expect(text).toContain("Needs attention");
    expect(text).toContain("15% free");
    expect(text).toContain("SafDiskAlmostFull");
    expect(text).toContain("TypeError in checkout");
    expect(text).toContain("1,200");
    expect(wrapper.find("[data-test=digest-deps]").text()).toContain("2 high/critical advisories");
    await vi.waitFor(() => expect(wrapper.findAll("img.ops-graph-img")).toHaveLength(3));
    wrapper.unmount();
  });
});
