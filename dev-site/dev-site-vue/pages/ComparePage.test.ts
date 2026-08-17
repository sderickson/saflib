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
      parentHashes: [FROM],
      authoredAt: "2026-01-02T00:00:00.000Z",
      message: "after",
      refs: [],
      analyzerVersion: "1",
      computedAt: "2026-01-02T01:00:00.000Z",
      status: "complete",
      summaryMetrics: summaryMetricsFixture({
        packageCount: 1,
        sourceFiles: 1,
        sourceLines: 20,
        testFiles: 1,
        testLines: 5,
        exportCount: 2,
        testCaseCount: 2,
      }),
    },
    {
      hash: FROM,
      parentHashes: [],
      authoredAt: "2026-01-01T00:00:00.000Z",
      message: "before",
      refs: [],
      analyzerVersion: "1",
      computedAt: "2026-01-01T01:00:00.000Z",
      status: "complete",
      summaryMetrics: summaryMetricsFixture({
        packageCount: 1,
        sourceFiles: 1,
        sourceLines: 10,
        testFiles: 0,
        testLines: 0,
        exportCount: 1,
        testCaseCount: 1,
      }),
    },
  ],
  nextCursor: null,
};

const mockDiff: DiffResponse = {
  commitDiff: {
    fromHash: FROM,
    toHash: TO,
    packageMetrics: {
      added: [],
      removed: [],
      changed: [
        {
          before: packageMetricsFixture({
            packageName: "@fixture/root",
            directory: "",
            sourceFiles: 1,
            sourceLines: 10,
            prodLines: 10,
            testLines: 0,
            testFiles: 0,
          }),
          after: packageMetricsFixture({
            packageName: "@fixture/root",
            directory: "",
            sourceFiles: 1,
            sourceLines: 20,
            prodLines: 15,
            testLines: 5,
            testFiles: 1,
          }),
        },
      ],
    },
    exports: {
      added: [
        {
          packageName: "@fixture/root",
          filePath: "src/b.ts",
          name: "b",
          kind: "const",
          signature: "= 1",
          docstring: null,
        },
      ],
      removed: [],
    },
    testCases: {
      added: [
        {
          packageName: "@fixture/root",
          filePath: "src/a.test.ts",
          fullName: "a > works",
          subjectName: "a",
          subjectSignature: "= 1",
          subjectFilePath: "src/a.ts",
          subjectConfidence: "adjacent",
        },
      ],
      removed: [],
    },
    dbSchemas: {
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
