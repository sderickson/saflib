import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import CommitDetailPage from "./CommitDetailPage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";

type GetResponse = DevSiteResponseBody["getCommits"][200];

const HASH = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const mockDetail: GetResponse = {
  commitDetail: {
    commit: {
      hash: HASH,
      parentHashes: [],
      authoredAt: "2026-01-02T00:00:00.000Z",
      message: "add math helpers",
      refs: [],
      analyzerVersion: "1",
      computedAt: "2026-01-02T01:00:00.000Z",
      status: "complete",
    },
    packageMetrics: [
      {
        packageName: "@fixture/root",
        directory: "",
        sourceFiles: 2,
        sourceLines: 40,
        prodLines: 30,
        testLines: 10,
        testFiles: 1,
      },
    ],
    exports: [
      {
        packageName: "@fixture/root",
        filePath: "src/math.ts",
        name: "add",
        kind: "function",
        signature: "(a: number, b: number)",
        docstring: null,
      },
    ],
    testCases: [
      {
        packageName: "@fixture/root",
        filePath: "src/math.test.ts",
        fullName: "math > adds",
        subjectName: null,
        subjectSignature: null,
        subjectFilePath: null,
        subjectConfidence: null,
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
    expect(wrapper.text()).toContain("@fixture/root");
    expect(wrapper.text()).toContain("add");
    expect(wrapper.text()).toContain("math > adds");
  });
});
