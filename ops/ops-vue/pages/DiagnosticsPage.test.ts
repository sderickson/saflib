import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import DiagnosticsPage from "./DiagnosticsPage.vue";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";
const probe = (id: string, side: "client" | "server", link: string, skip: string | null = null) => ({
  id,
  side,
  label: id,
  what: `does ${id}`,
  destination: link,
  link,
  skip_reason: skip,
});
const fired: string[] = [];

describe("DiagnosticsPage", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/diagnostics`, () =>
      HttpResponse.json({
        probes: [
          probe("client-promise", "client", "issues"),
          probe("server-warn-log", "server", "logs"),
          probe("server-500", "server", "issues"),
          probe("test-alert", "server", "alerts", "Needs Alertmanager"),
        ],
      }),
    ),
    http.post(`${API}/ops/diagnostics/runs/:run/probes/:probe`, ({ params }) => {
      fired.push(String(params.probe));
      if (params.probe === "server-500") return HttpResponse.json({ message: "boom" }, { status: 500 });
      return HttpResponse.json({ started_at: new Date().toISOString() }, { status: 202 });
    }),
    http.get(`${API}/ops/diagnostics/runs/:run`, () =>
      HttpResponse.json({
        results: [
          { probe_id: "client-promise", landed_at: new Date().toISOString(), ref: { kind: "issue", id: "i1" } },
          { probe_id: "server-warn-log", landed_at: new Date().toISOString(), ref: { kind: "log", id: "r-123" } },
          { probe_id: "server-500", landed_at: null, ref: null },
          { probe_id: "test-alert", landed_at: null, ref: null },
        ],
      }),
    ),
    http.get(`${API}/ops/diagnostics/metrics`, () =>
      HttpResponse.json({
        started_at: new Date().toISOString(),
        raw: null,
        metrics: [
          { name: "jobs_total", help: "Jobs", type: "counter", series: 2, total: 5, histogram: null },
          { name: "process_resident_memory_bytes", help: "RSS", type: "gauge", series: 1, total: 301_989_888, histogram: null },
          {
            name: "http_request_duration_seconds",
            help: "Latency",
            type: "histogram",
            series: 3,
            total: null,
            histogram: { buckets: [{ le: "0.1", count: 18 }, { le: "+Inf", count: 2 }], count: 20, sum: 1.5, p95_le: "+Inf" },
          },
        ],
      }),
    ),
    http.get(`${API}/ops/health`, () =>
      HttpResponse.json({
        health: {
          status: "warn",
          checked_at: new Date().toISOString(),
          checks: [
            { name: "disk", status: "warn", summary: "18% free (87 GB of 461 GB)", duration_ms: 1 },
            { name: "daemon-db", status: "ok", summary: "ok", duration_ms: 2 },
          ],
        },
      }),
    ),
    http.get(`${API}/ops/digest`, () => HttpResponse.json({ digest: { process: { started_at: new Date().toISOString() } } })),
  ]);

  it("runs every check, reports where each landed, and shows this process's metrics", async () => {
    // The client-promise probe's rejection is the point of the test.
    const swallow = (e: PromiseRejectionEvent) => e.preventDefault();
    window.addEventListener("unhandledrejection", swallow);
    process.on("unhandledRejection", () => {});
    const wrapper = mountTestApp(DiagnosticsPage, {
      props: { links: { issues: "/ops-issues", logs: "/ops-logs", alerts: "/ops-alerts" } },
    });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=diagnostic-probe]")).toHaveLength(4));
    expect(wrapper.find("[data-test=result-test-alert]").text()).toContain("Skipped: Needs Alertmanager");
    expect(wrapper.find("[data-test=run-test-alert]").attributes("disabled")).toBeDefined();

    await wrapper.find("[data-test=diagnostics-run-all]").trigger("click");
    await vi.waitFor(() => expect(fired.sort()).toEqual(["server-500", "server-warn-log"]));
    await vi.waitFor(() => expect(wrapper.find("[data-test=result-server-warn-log]").text()).toMatch(/Landed in/), { timeout: 4000 });
    const logResult = wrapper.find("[data-test=result-server-warn-log]");
    expect(logResult.find("a").attributes("href")).toBe("/ops-logs?id=r-123");
    expect(wrapper.find("[data-test=result-client-promise]").text()).toMatch(/Landed in.*View in Issues/);
    expect(wrapper.find("[data-test=result-server-500]").text()).toContain("Waiting");
    expect(wrapper.find("[data-test=diagnostics-counts]").text()).toContain("2 landed");

    await wrapper.find("[data-test=diagnostics-tab-metrics]").trigger("click");
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=metric-row]")).toHaveLength(3));
    const metrics = wrapper.find("[data-test=diagnostics-metrics]");
    expect(metrics.text()).toContain("20 obs");
    expect(metrics.text()).toContain("5");
    // *_bytes metrics read in KB/MB.
    expect(metrics.text()).toContain("288 MB");
    wrapper.unmount();
    window.removeEventListener("unhandledrejection", swallow);
  });

  it("lists every health check with its status on the Health tab", async () => {
    const { router } = await import("./test_router.ts");
    await router.push("/?tab=health");
    const wrapper = mountTestApp(DiagnosticsPage);
    await vi.waitFor(() => expect(wrapper.find("[data-test=health-disk]").exists()).toBe(true));
    expect(wrapper.find("[data-test=health-disk]").text()).toContain("18% free");
    expect(wrapper.find("[data-test=health-disk] .status-icon").attributes("aria-label")).toBe("Warning");
    expect(wrapper.find("[data-test=health-daemon-db] .status-icon").attributes("aria-label")).toBe("OK");
    wrapper.unmount();
    await router.push("/");
  });
});
