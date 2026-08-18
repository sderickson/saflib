import { describe, it, expect, vi } from "vitest";
import { stubGlobals } from "@saflib/vue/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { http, HttpResponse, type PathParams } from "msw";
import type { DevSiteResponseBody } from "@saflib/dev-site-spec";
import CheckoutPage from "./CheckoutPage.vue";
import { router } from "./test_router";
import { mountTestApp } from "../test-app";
import { packageMetricsFixture } from "../test-fixtures.ts";

type CheckoutResponse = DevSiteResponseBody["getCheckout"][200];
type DiffResponse = DevSiteResponseBody["diffCommits"][200];
type ScanResponse = DevSiteResponseBody["executeScan"][200];
type PackageResponse = DevSiteResponseBody["getCommitPackage"][200];

const HEAD = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const BASE = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function checkoutFixture(
  partial: Partial<CheckoutResponse> = {},
): CheckoutResponse {
  return {
    hash: HEAD,
    message: "feature work",
    authoredAt: "2026-01-02T00:00:00.000Z",
    analyzed: true,
    productRoot: "",
    branch: "feature",
    packages: [
      packageMetricsFixture({
        packageName: "@demo/keep",
        directory: "products/keep",
        sourceLines: 20,
        testFiles: 1,
        testLines: 5,
      }),
    ],
    compareCandidates: ["main", "other"],
    compare: {
      againstRef: "main",
      mergeBaseHash: BASE,
      mergeBaseAnalyzed: false,
      mergeBaseMessage: "fork parent",
      mergeBaseAuthoredAt: "2026-01-01T00:00:00.000Z",
      renames: [],
    },
    ...partial,
  };
}

const emptyPackage: PackageResponse = {
  packageDetail: {
    commitHash: HEAD,
    packageName: "@demo/keep",
    directory: "products/keep",
    sourceFiles: 1,
    sourceLines: 20,
    prodLines: 15,
    testLines: 5,
    testFiles: 1,
    exports: [],
    testCases: [],
  },
};

const packageAndRepoHandlers = [
  http.get("http://test.localhost:3000/api/commits/:hash/packages/:pkg", () =>
    HttpResponse.json(emptyPackage),
  ),
  http.get("http://test.localhost:3000/api/repo/files", () =>
    HttpResponse.json({ files: [] }),
  ),
  http.get("http://test.localhost:3000/api/repo/file", () =>
    HttpResponse.json({ path: "package.json", content: "{}" }),
  ),
];

describe("CheckoutPage compare query param", () => {
  stubGlobals();
  setupMockServer([
    http.get<PathParams, never, CheckoutResponse>(
      "http://test.localhost:3000/api/checkout",
      () => HttpResponse.json(checkoutFixture()),
    ),
    http.post<PathParams, { commitHash?: string }, ScanResponse>(
      "http://test.localhost:3000/api/scan",
      async ({ request }) => {
        const body = (await request.json()) as { commitHash?: string };
        expect(body.commitHash).toBe(BASE);
        return HttpResponse.json({
          scanned: [BASE],
          skipped: [],
          failed: [],
        });
      },
    ),
    ...packageAndRepoHandlers,
  ]);

  it("offers Scan fork point when the merge-base is unscanned", async () => {
    await router.push({ path: "/checkout", query: { compare: "main" } });
    const wrapper = mountTestApp(CheckoutPage, {
      propsData: { subdomain: "test" },
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("Scan fork point");
    });
    expect(wrapper.text()).toContain("fork parent");
    expect(wrapper.text()).toContain("Compare");

    const scanBtn = wrapper
      .findAllComponents({ name: "v-btn" })
      .find((b) => b.text() === "Scan fork point");
    expect(scanBtn).toBeDefined();
    await scanBtn!.trigger("click");
  });
});

describe("CheckoutPage compare package tree", () => {
  stubGlobals();
  setupMockServer([
    http.get<PathParams, never, CheckoutResponse>(
      "http://test.localhost:3000/api/checkout",
      () =>
        HttpResponse.json(
          checkoutFixture({
            compare: {
              againstRef: "main",
              mergeBaseHash: BASE,
              mergeBaseAnalyzed: true,
              mergeBaseMessage: "fork parent",
              mergeBaseAuthoredAt: "2026-01-01T00:00:00.000Z",
              renames: [],
            },
          }),
        ),
    ),
    http.get<PathParams, never, DiffResponse>(
      `http://test.localhost:3000/api/commits/${BASE}/diff/${HEAD}`,
      () =>
        HttpResponse.json({
          commitDiff: {
            fromHash: BASE,
            toHash: HEAD,
            packageMetrics: {
              added: [],
              removed: [
                packageMetricsFixture({
                  packageName: "@demo/gone",
                  directory: "products/gone",
                  sourceLines: 8,
                  testFiles: 0,
                  testLines: 0,
                }),
              ],
              changed: [
                {
                  before: packageMetricsFixture({
                    packageName: "@demo/keep",
                    directory: "products/keep",
                    sourceLines: 10,
                  }),
                  after: packageMetricsFixture({
                    packageName: "@demo/keep",
                    directory: "products/keep",
                    sourceLines: 20,
                    testFiles: 1,
                    testLines: 5,
                  }),
                },
              ],
            },
            exports: { added: [], removed: [] },
            testCases: { added: [], removed: [] },
            dbSchemas: {
              tables: { added: [], removed: [] },
              columns: { added: [], removed: [], changed: [] },
            },
          },
        }),
    ),
    ...packageAndRepoHandlers,
  ]);

  it("lists removed packages after both commits are analyzed", async () => {
    await router.push({ path: "/checkout", query: { compare: "main" } });
    const wrapper = mountTestApp(CheckoutPage, {
      propsData: { subdomain: "test" },
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("gone");
      expect(wrapper.text()).toContain("keep");
    });
    expect(wrapper.text()).toContain("removed");
    expect(wrapper.text()).toContain("changed");
  });

  it("shows source/test LOC delta next to the selected package name", async () => {
    await router.push({
      path: "/checkout",
      query: { compare: "main", package: "@demo/keep" },
    });
    const wrapper = mountTestApp(CheckoutPage, {
      propsData: { subdomain: "test" },
    });
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain("+10/+5 LOC");
    });
    expect(wrapper.get(".pkg-head__name").text()).toBe("@demo/keep");
  });
});
