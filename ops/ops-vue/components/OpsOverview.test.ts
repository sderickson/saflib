import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import OpsOverview from "./OpsOverview.vue";
import HealthPill from "./HealthPill.vue";
import TrafficChip from "./TrafficChip.vue";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const tile = (key: string, group: string, value: string, tone: string) => ({ key, group, label: key, value, detail: "d", tone });
let attention: unknown[] = [];
const digest = () => ({
  since: "2026-11-24T10:00:00.000Z",
  generated_at: "2026-11-25T10:21:00.000Z",
  summary: {
    needs_attention: attention.length > 0,
    attention,
    health_status: "ok",
    new_issues: 1,
    regressed_issues: 0,
    open_issues: 1,
    new_log_templates: 0,
    deploys: 1,
    boots: 1,
    firing_alerts: 0,
  },
  health: { status: "ok", failing: [] },
  deploys: [],
  issues: null,
  logs: null,
  metrics: null,
  activity: null,
  alerts: null,
  dependencies: null,
  tiles: [
    tile("issues", "system", "1 open issue", "bad"),
    tile("jobs", "system", "0 failed", "ok"),
    { ...tile("slowest-endpoint", "traffic", "GET /matters", "ok"), always_show: true },
    tile("whatsapp-inbox", "customers", "3 awaiting reply", "warn"),
  ],
  process: { started_at: "2026-11-25T10:09:00.000Z", requests_total: 2712, p95_upper_ms: 100, rss_bytes: 212 * 1024 * 1024 },
});

describe("OpsOverview", () => {
  stubGlobals();
  setupMockServer([http.get(`${API}/ops/digest`, () => HttpResponse.json({ digest: digest() }))]);

  it("shows tiles by group with links, and since-start numbers without Prometheus", async () => {
    attention = [{ kind: "issues", key: "issues", summary: "1 open issue: Prometheus unreachable", tone: "bad" }];
    const wrapper = mountTestApp(OpsOverview, {
      props: { links: { issues: "/ops-issues", jobs: "/jobs?status=failed", diagnostics: "/diagnostics", metrics: "/ops-metrics" } },
    });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=overview-tile]").length).toBe(4));
    const tiles = wrapper.findAll("[data-test=overview-tile]");
    expect(tiles.map((t) => t.attributes("data-tone"))).toEqual(["bad", "ok", "ok", "warn"]);
    // Rows say something only when it's noteworthy (or the value is the point).
    expect(tiles[0]!.text()).toContain("1 open issue");
    expect(tiles[1]!.text()).not.toContain("0 failed");
    expect(tiles[2]!.text()).toContain("GET /matters");
    expect(tiles[3]!.text()).toContain("3 awaiting reply");
    expect(tiles[0]!.find(".status-icon").attributes("aria-label")).toBe("Needs action");
    expect(tiles[1]!.find("a").attributes("href")).toBe("/jobs?status=failed");
    // Endpoint rows open Metrics on the ranked query.
    expect(tiles[2]!.find("a").attributes("href")).toMatch(/^\/ops-metrics\?q=topk/);
    expect(wrapper.text()).toContain("Traffic");
    expect(wrapper.text()).toContain("Customers");

    const sinceStart = wrapper.find("[data-test=overview-since-start]").text();
    expect(sinceStart).toContain("2,712");
    expect(sinceStart).toContain("≤ 100 ms");
    expect(sinceStart).toContain("212 MB");
    wrapper.unmount();
  });

  it("top bar chips read the same digest", async () => {
    attention = [{ kind: "issues", key: "issues", summary: "x", tone: "warn" }];
    const pill = mountTestApp(HealthPill);
    const traffic = mountTestApp(TrafficChip);
    await vi.waitFor(() => expect(pill.find("[data-test=health-pill]").text()).toContain("1 needs attention"));
    await vi.waitFor(() => expect(traffic.find("[data-test=traffic-chip]").text()).toContain("2.7K requests since start"));
    pill.unmount();
    traffic.unmount();
  });
});
