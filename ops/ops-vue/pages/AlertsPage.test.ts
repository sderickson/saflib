import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { OpsAlertResponse } from "@saflib/ops-spec";
import AlertsAsync from "./AlertsAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const alert: OpsAlertResponse = {
  id: "a1",
  fingerprint: "f",
  alertname: "SafDiskAlmostFull",
  severity: "warning",
  status: "firing",
  labels: { alertname: "SafDiskAlmostFull", severity: "warning", saf_app: "host", mountpoint: "/" },
  starts_at: "2026-11-09T10:00:00.000Z",
  ends_at: null,
  last_received_at: "2026-11-09T10:05:00.000Z",
  acked_at: null,
  acked_by: null,
  untrusted: { annotations: { summary: "Host disk is 85% full <script>" } },
};

let acked = 0;

describe("AlertsAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/alerts`, () => HttpResponse.json({ alerts: [alert] })),
    http.post(`${API}/ops/alerts/a1/ack`, () => {
      acked++;
      return HttpResponse.json({ alert: { ...alert, acked_at: "2026-11-09T11:00:00.000Z", acked_by: "user:u1" } });
    }),
  ]);

  it("lists firing alerts as plain text and acknowledges one", async () => {
    await router.push("/ops/alerts");
    const wrapper = mountTestApp(AlertsAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=alert-row]").length).toBe(1));
    const row = wrapper.find("[data-test=alert-row]");
    expect(row.text()).toContain("Host disk is 85% full <script>");
    expect(row.text()).toContain("saf_app=host");
    await wrapper.find("[data-test=alert-ack]").trigger("click");
    await vi.waitFor(() => expect(acked).toBe(1));
    wrapper.unmount();
  });
});
