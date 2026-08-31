import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import ComparePage from "./ComparePage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";
import {
  packageMetricsFixture,
  summaryMetricsFixture,
} from "../test-fixtures.ts";

type ListResponse = DevSiteResponseBody["listCommits"][200];
type DiffResponse = DevSiteResponseBody["diffCommits"][200];

const FROM = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TO = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const mockList: ListResponse = {
  commits: [
    {
      hash: TO,
      parent_hashes: [FROM],
      authored_at: "2026-01-02T00:00:00.000Z",
      message: "after",
      refs: [],
      analyzer_version: "1",
      computed_at: "2026-01-02T01:00:00.000Z",
      status: "complete",
      summary_metrics: summaryMetricsFixture({
        package_count: 1,
        source_files: 1,
        source_lines: 20,
        test_files: 1,
        test_lines: 5,
        export_count: 2,
        test_case_count: 2,
      }),
    },
    {
      hash: FROM,
      parent_hashes: [],
      authored_at: "2026-01-01T00:00:00.000Z",
      message: "before",
      refs: [],
      analyzer_version: "1",
      computed_at: "2026-01-01T01:00:00.000Z",
      status: "complete",
      summary_metrics: summaryMetricsFixture({
        package_count: 1,
        source_files: 1,
        source_lines: 10,
        test_files: 0,
        test_lines: 0,
        export_count: 1,
        test_case_count: 1,
      }),
    },
  ],
  next_cursor: null,
};

const mockDiff: DiffResponse = {
  commit_diff: {
    from_hash: FROM,
    to_hash: TO,
    package_metrics: {
      added: [],
      removed: [],
      changed: [
        {
          before: packageMetricsFixture({
            package_name: "@fixture/root",
            directory: "",
            source_files: 1,
            source_lines: 10,
            prod_lines: 10,
            test_lines: 0,
            test_files: 0,
          }),
          after: packageMetricsFixture({
            package_name: "@fixture/root",
            directory: "",
            source_files: 1,
            source_lines: 20,
            prod_lines: 15,
            test_lines: 5,
            test_files: 1,
          }),
        },
      ],
    },
    exports: {
      added: [
        {
          package_name: "@fixture/root",
          file_path: "src/b.ts",
          name: "b",
          kind: "const",
          signature: "= 1",
          docstring: null,
        },
      ],
      removed: [],
    },
    test_cases: {
      added: [
        {
          package_name: "@fixture/root",
          file_path: "src/a.test.ts",
          full_name: "a > works",
          subject_name: "a",
          subject_signature: "= 1",
          subject_file_path: "src/a.ts",
          subject_confidence: "adjacent",
        },
      ],
      removed: [],
    },
    db_schemas: {
      tables: { added: [], removed: [] },
      columns: { added: [], removed: [], changed: [] },
    },
  },
};

const handlers = [
  http.get<PathParams, never, ListResponse>(
    "http://test.localhost:3000/api/commits",
    () => HttpResponse.json(mockList),
  ),
  http.get<PathParams, never, DiffResponse>(
    `http://test.localhost:3000/api/commits/${FROM}/diff/${TO}`,
    () => HttpResponse.json(mockDiff),
  ),
];

describe("ComparePage", () => {
  stubGlobals();
  setupMockServer(handlers);

  it("renders export and test-case deltas for two commits", async () => {
    await router.push("/compare");
    const wrapper = mountTestApp(ComparePage, {
      propsData: {
        subdomain: "test",
        initialFromHash: FROM,
        initialToHash: TO,
      },
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Compare commits");
      expect(wrapper.text()).toContain("a > works");
    });
    expect(wrapper.text()).toContain("Exports — +1");
    expect(wrapper.text()).toContain("Test cases — +1");
    expect(wrapper.text()).toContain("@fixture/root");
  });
});
