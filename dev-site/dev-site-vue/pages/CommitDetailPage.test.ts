import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import CommitDetailPage from "./CommitDetailPage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";
import { packageMetricsFixture } from "../test-fixtures.ts";

type GetResponse = DevSiteResponseBody["getCommits"][200];

const HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const mockDetail: GetResponse = {
  commit_detail: {
    commit: {
      hash: HASH,
      parent_hashes: [],
      authored_at: "2026-01-02T00:00:00.000Z",
      message: "add math helpers",
      refs: [],
      analyzer_version: "1",
      computed_at: "2026-01-02T01:00:00.000Z",
      status: "complete",
    },
    package_metrics: [
      packageMetricsFixture({
        package_name: "@fixture/root",
        directory: "",
        source_files: 2,
        source_lines: 40,
        prod_lines: 30,
        test_lines: 10,
        test_files: 1,
        debt_count: 1,
        issue_counts_by_kind: {
          "dead-code": 1,
          "oversized-file": 0,
          "package-layout": 0,
        },
      }),
    ],
    exports: [
      {
        package_name: "@fixture/root",
        file_path: "src/math.ts",
        name: "add",
        kind: "function",
        signature: "(a: number, b: number)",
        docstring: null,
      },
    ],
    test_cases: [
      {
        package_name: "@fixture/root",
        file_path: "src/math.test.ts",
        full_name: "math > adds",
      },
    ],
  },
};

const handlers = [
  http.get<PathParams, never, GetResponse>(
    `http://test.localhost:3000/api/commits/${HASH}`,
    () => HttpResponse.json(mockDetail),
  ),
];

describe("CommitDetailPage", () => {
  stubGlobals();
  setupMockServer(handlers);

  it("renders package / export / test tables for a commit", async () => {
    await router.push(`/commits/${HASH}`);
    const wrapper = mountTestApp(CommitDetailPage, {
      propsData: { subdomain: "test", hash: HASH },
    });
    await vi.waitFor(() => {
      expect(
        wrapper.findComponent({ name: "v-progress-linear" }).exists(),
      ).toBe(false);
    });
    expect(wrapper.find("h1").text()).toBe("Commit detail");
    expect(wrapper.text()).toContain("add math helpers");
    expect(wrapper.text()).toContain("debt hotspots");
    expect(wrapper.text()).toContain("@fixture/root");
    expect(wrapper.text()).toContain("add");
    expect(wrapper.text()).toContain("math > adds");
  });
});
