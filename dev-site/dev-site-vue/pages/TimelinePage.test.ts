import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import TimelinePage from "./TimelinePage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";
import { summaryMetricsFixture } from "../test-fixtures.ts";

type ListResponse = DevSiteResponseBody["listCommits"][200];
type ScanResponse = DevSiteResponseBody["executeScan"][200];

const mockList: ListResponse = {
  commits: [
    {
      hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      parent_hashes: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      authored_at: "2026-01-02T00:00:00.000Z",
      message: "second commit\n\nbody",
      refs: [{ name: "main", type: "branch", is_main_ancestor: true }],
      analyzer_version: "1",
      computed_at: "2026-01-02T01:00:00.000Z",
      status: "complete",
      summary_metrics: summaryMetricsFixture({
        package_count: 1,
        source_files: 2,
        source_lines: 100,
        test_files: 1,
        test_lines: 30,
        export_count: 2,
        test_case_count: 3,
        debt_count: 2,
        has_issue_stats: true,
        issue_counts_by_kind: {
          "dead-code": 1,
          "oversized-file": 1,
          "package-layout": 0,
        },
      }),
    },
    {
      hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      parent_hashes: [],
      authored_at: "2026-01-01T00:00:00.000Z",
      message: "first commit",
      refs: [],
      analyzer_version: "1",
      computed_at: "2026-01-01T01:00:00.000Z",
      status: "complete",
      summary_metrics: summaryMetricsFixture({
        package_count: 1,
        source_files: 1,
        source_lines: 50,
        test_files: 0,
        test_lines: 0,
        export_count: 1,
        test_case_count: 0,
        has_issue_stats: true,
      }),
    },
  ],
  next_cursor: null,
};

type CheckoutResponse = DevSiteResponseBody["getCheckout"][200];

const mockCheckout: CheckoutResponse = {
  hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  message: "second commit",
  authored_at: "2026-01-02T00:00:00.000Z",
  analyzed: true,
  product_root: "",
  branch: "main",
  packages: [],
  compare_candidates: ["main"],
};

const handlers = [
  http.get<PathParams, never, ListResponse>(
    "http://test.localhost:3000/api/commits",
    () => HttpResponse.json(mockList),
  ),
  http.get<PathParams, never, CheckoutResponse>(
    "http://test.localhost:3000/api/checkout",
    () => HttpResponse.json(mockCheckout),
  ),
  http.post<PathParams, { limit?: number }, ScanResponse>(
    "http://test.localhost:3000/api/scan",
    async ({ request }) => {
      const body = (await request.json()) as { limit?: number };
      return HttpResponse.json({
        scanned: body.limit
          ? ["cccccccccccccccccccccccccccccccccccccccc"]
          : ["cccccccccccccccccccccccccccccccccccccccc"],
        skipped: [],
        failed: [],
      });
    },
  ),
];

describe("TimelinePage", () => {
  stubGlobals();
  setupMockServer(handlers);

  const mountComponent = async (waitForData = true) => {
    await router.push("/history");
    const wrapper = mountTestApp(TimelinePage, {
      propsData: { subdomain: "test" },
    });
    if (waitForData) {
      await vi.waitFor(() => {
        expect(
          wrapper.findComponent({ name: "v-progress-linear" }).exists(),
        ).toBe(false);
      });
    }
    return wrapper;
  };

  it("renders the title and loading indicator initially", async () => {
    const wrapper = await mountComponent(false);
    expect(wrapper.find("h1").text()).toBe("History");
    expect(wrapper.findComponent({ name: "v-progress-linear" }).exists()).toBe(
      true,
    );
  });

  it("renders commit rows with health chips after loading", async () => {
    const wrapper = await mountComponent();
    const table = wrapper.findComponent({ name: "v-data-table" });
    expect(table.exists()).toBe(true);
    expect(wrapper.text()).toContain("second commit");
    expect(wrapper.text()).toContain("aaaaaaaaaa");
    expect(wrapper.text()).toContain("Debt over time");
    expect(
      wrapper.findComponent({ name: "v-chip", text: "Healthy" }).exists(),
    ).toBe(true);
    expect(
      wrapper.findComponent({ name: "v-chip", text: "Untested" }).exists(),
    ).toBe(true);
  });

  it("runs a scan when Scan next is clicked", async () => {
    const wrapper = await mountComponent();
    const scanBtn = wrapper
      .findAllComponents({ name: "v-btn" })
      .find((b) => b.text() === "Scan next");
    expect(scanBtn).toBeDefined();
    await scanBtn!.trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Scanned 1");
    });
  });
});
