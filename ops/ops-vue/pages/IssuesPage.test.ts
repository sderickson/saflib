import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse } from "msw";
import type { OpsIssueResponse } from "@saflib/ops-spec";
import IssuesAsync from "./IssuesAsync.vue";
import { router } from "./test_router.ts";
import { mountTestApp } from "../test-app.ts";

const API = "http://api.localhost:3000";

const issue = (id: string, title: string, status: OpsIssueResponse["status"] = "open"): OpsIssueResponse => ({
  id,
  fingerprint: `fp-${id}`,
  level: "error",
  kind: "server",
  service_name: "hub",
  operation_name: "getThing",
  first_seen: "2026-11-08T10:00:00.000Z",
  last_seen: "2026-11-09T10:00:00.000Z",
  count: 3,
  window_count: 3,
  first_seen_version: "abc",
  last_seen_version: "abc",
  status,
  status_note: null,
  status_changed_at: null,
  status_changed_by: null,
  resolved_in_version: null,
  ignored_until: null,
  untrusted: { title },
});

const posts: { url: string; body: unknown }[] = [];
const statusQueries: string[][] = [];

describe("IssuesAsync", () => {
  stubGlobals();
  setupMockServer([
    http.get(`${API}/ops/issues`, ({ request }) => {
      const statuses = new URL(request.url).searchParams.getAll("status");
      statusQueries.push(statuses);
      if (statuses.includes("resolved")) return HttpResponse.json({ issues: [issue("r1", "old bug", "resolved")], next_cursor: null });
      return HttpResponse.json({ issues: [issue("i1", "<b>TypeError</b> in checkout")], next_cursor: null });
    }),
    http.get(`${API}/ops/issues/i1/occurrences`, () =>
      HttpResponse.json({
        occurrences: [
          { id: "o1", ts: "2026-11-09T10:00:00.000Z", request_id: "req-1", version: "abc", untrusted: { message: "boom", stack: "Error: boom\n    at x", fields: null } },
        ],
      }),
    ),
    http.post(`${API}/ops/issues/i1/resolve`, async ({ request }) => {
      posts.push({ url: request.url, body: await request.json() });
      return HttpResponse.json({ issue: issue("i1", "x", "resolved") });
    }),
  ]);

  it("lists issues as plain text, shows occurrences, and resolves", async () => {
    posts.length = 0;
    await router.push("/ops/issues");
    const wrapper = mountTestApp(IssuesAsync, { attachTo: document.body });
    await vi.waitFor(() => expect(wrapper.findAll("[data-test=issue-row]").length).toBe(1));
    const row = wrapper.find("[data-test=issue-row]");
    expect(row.text()).toContain("<b>TypeError</b> in checkout");
    expect(row.find("b").exists()).toBe(false);
    expect(statusQueries.at(-1)).toEqual(["open", "regressed"]);

    await row.find("button").trigger("click");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Error: boom"));
    await vi.waitFor(() => expect(wrapper.find("[data-test=issue-resolve]").exists()).toBe(true));
    await wrapper.find("[data-test=issue-resolve]").trigger("click");
    await vi.waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0]!.body).toEqual({});
    wrapper.unmount();
  });
});
