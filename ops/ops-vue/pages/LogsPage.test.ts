import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { OpsLogEntryResponse } from "@saflib/ops-spec";
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
  request_id: `req-${id}`,
  user_id: null,
  template_hash: "h",
  redactions: 0,
  untrusted: { message, fields: null },
  ...extra,
});

const requests: URL[] = [];

describe("LogsAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/admin/logs`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      if (url.searchParams.get("cursor") === "2") {
        return HttpResponse.json({ logs: [line(1, "first line")], next_cursor: null });
      }
      if (url.searchParams.get("q") === "boom") {
        return HttpResponse.json({ logs: [line(9, "boom happened", { level: "error" })], next_cursor: null });
      }
      return HttpResponse.json({
        logs: [
          line(3, "<img src=x onerror=alert(1)> rendered as text", { redactions: 2 }),
          line(2, "second line"),
        ],
        next_cursor: "2",
      });
    }),
  ]);

  async function mount() {
    requests.length = 0;
    await router.push("/ops/logs");
    const wrapper = mountTestApp(LogsAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=log-line]").length).toBeGreaterThan(0));
    return wrapper;
  }

  it("renders lines as plain text, with redaction badges", async () => {
    const wrapper = await mount();
    const rows = wrapper.findAll("[data-test=log-line]");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("<img src=x onerror=alert(1)> rendered as text");
    expect(rows[0]!.find("img").exists()).toBe(false);
    expect(rows[0]!.text()).toContain("2 redacted");
    wrapper.unmount();
  });

  it("loads more with the cursor", async () => {
    const wrapper = await mount();
    await wrapper.find("[data-test=logs-more]").trigger("click");
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=log-line]")).toHaveLength(3));
    expect(requests.at(-1)!.searchParams.get("cursor")).toBe("2");
    wrapper.unmount();
  });

  it("applies the search filter", async () => {
    const wrapper = await mount();
    await wrapper.find("[data-test=logs-q] input").setValue("boom");
    await wrapper.find("[data-test=logs-apply]").trigger("click");
    await vi.waitFor(() => expect(wrapper.text()).toContain("boom happened"));
    expect(requests.at(-1)!.searchParams.get("q")).toBe("boom");
    wrapper.unmount();
  });
});
