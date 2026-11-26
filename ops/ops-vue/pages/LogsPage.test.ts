import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { OpsLogEntryResponse, OpsLogGroupResponse } from "@saflib/ops-spec";
import LogsAsync from "./LogsAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const line = (id: number, message: string, extra: Partial<OpsLogEntryResponse> = {}): OpsLogEntryResponse => ({
  id,
  ts: "2026-11-08T10:00:00.000Z",
  level: "info",
  service_name: "svc",
  subsystem_name: "svc.http",
  operation_name: "getThing",
  request_id: "req-1",
  user_id: null,
  context_kind: "request",
  context_id: "req-1",
  template_hash: "h",
  redactions: 0,
  untrusted: { message, fields: null },
  ...extra,
});

const group = (extra: Partial<OpsLogGroupResponse> = {}): OpsLogGroupResponse => ({
  kind: "request",
  context_id: "req-1",
  line_id: null,
  first_ts: "2026-11-08T10:00:00.000Z",
  last_ts: "2026-11-08T10:00:03.000Z",
  count: 2,
  errors: 0,
  warnings: 1,
  user_id: null,
  operation_name: "getThing",
  service_name: "svc",
  request: { method: "GET", route: "/things/{id}", status: 502, duration_ms: 3012, internal: false },
  untrusted: { first_message: "loading" },
  ...extra,
});

const requests: URL[] = [];

describe("LogsAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/logs/groups`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        groups: [
          group(),
          group({ kind: null, context_id: null, line_id: 7, count: 1, warnings: 0, request: null, untrusted: { first_message: "cache evicted" } }),
        ],
        next_cursor: null,
      });
    }),
    http.get(`${API}/ops/logs`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      if (url.searchParams.get("context_id") === "req-1") {
        return HttpResponse.json({
          logs: [
            line(3, "<img src=x onerror=alert(1)> rendered as text", { ts: "2026-11-08T10:00:03.000Z", level: "warn", redactions: 2 }),
            line(2, "loading", { untrusted: { message: "loading", fields: { note: "<b>plain</b>" } } }),
          ],
          next_cursor: null,
        });
      }
      return HttpResponse.json({ logs: [line(5, "chrono line")], next_cursor: null });
    }),
  ]);

  async function mount(path = "/ops/logs") {
    requests.length = 0;
    await router.push(path);
    const wrapper = mountTestApp(LogsAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=log-group]").length).toBeGreaterThan(0));
    return wrapper;
  }

  it("lists groups by request; groups with warnings open showing their lines as plain text", async () => {
    const wrapper = await mount();
    const rows = wrapper.findAll("[data-test=log-group]");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("/things/{id}");
    expect(rows[0]!.text()).toContain("502");
    expect(rows[0]!.text()).toContain("3.0 s");
    expect(rows[1]!.text()).toContain("cache evicted");

    await vi.waitFor(() => expect(wrapper.findAll("[data-test=log-line]")).toHaveLength(2));
    const lines = wrapper.find("[data-test=log-group-lines]");
    expect(lines.text()).toContain("<img src=x onerror=alert(1)> rendered as text");
    expect(lines.find("img").exists()).toBe(false);
    expect(lines.text()).toContain("+3.0 s");
    expect(lines.text()).toContain("2 redacted");
    wrapper.unmount();
  });

  it("collapses a group on click", async () => {
    const wrapper = await mount();
    await vi.waitFor(() => expect(wrapper.find("[data-test=log-group-lines]").exists()).toBe(true));
    await wrapper.findAll("[data-test=log-group]")[0]!.trigger("click");
    expect(wrapper.find("[data-test=log-group-lines]").exists()).toBe(false);
    wrapper.unmount();
  });

  it("switches to the chronological view and back via the URL", async () => {
    const wrapper = await mount();
    await wrapper.find("[data-test=logs-view-chrono]").trigger("click");
    await vi.waitFor(() => expect(router.currentRoute.value.query.view).toBe("chrono"));
    await vi.waitFor(() => expect(wrapper.find("[data-test=logs-chrono]").text()).toContain("chrono line"));
    wrapper.unmount();
  });

  it("filters from the URL", async () => {
    const wrapper = await mount("/ops/logs?user=u_1&level=warn&q=boom");
    await vi.waitFor(() =>
      expect(
        requests.some(
          (u) =>
            u.pathname === "/ops/logs/groups" &&
            u.searchParams.get("user_id") === "u_1" &&
            u.searchParams.get("level") === "warn" &&
            u.searchParams.get("q") === "boom",
        ),
      ).toBe(true),
    );
    wrapper.unmount();
  });
});
