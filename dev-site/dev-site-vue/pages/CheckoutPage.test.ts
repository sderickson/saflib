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
    authored_at: "2026-01-02T00:00:00.000Z",
    analyzed: true,
    product_root: "",
    branch: "feature",
    packages: [
      packageMetricsFixture({
        package_name: "@demo/keep",
        directory: "products/keep",
        source_lines: 20,
        test_files: 1,
        test_lines: 5,
      }),
    ],
    compare_candidates: ["main", "other"],
    compare: {
      against_ref: "main",
      merge_base_hash: BASE,
      merge_base_analyzed: false,
      merge_base_message: "fork parent",
      merge_base_authored_at: "2026-01-01T00:00:00.000Z",
      renames: [],
    },
    ...partial,
  };
}

const emptyPackage: PackageResponse = {
  package_detail: {
    commit_hash: HEAD,
    package_name: "@demo/keep",
    directory: "products/keep",
    source_files: 1,
    source_lines: 20,
    prod_lines: 15,
    test_lines: 5,
    test_files: 1,
    exports: [],
    test_cases: [],
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
    http.post<PathParams, { commit_hash?: string }, ScanResponse>(
      "http://test.localhost:3000/api/scan",
      async ({ request }) => {
        const body = (await request.json()) as { commit_hash?: string };
        expect(body.commit_hash).toBe(BASE);
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
              against_ref: "main",
              merge_base_hash: BASE,
              merge_base_analyzed: true,
              merge_base_message: "fork parent",
              merge_base_authored_at: "2026-01-01T00:00:00.000Z",
              renames: [],
            },
          }),
        ),
    ),
    http.get<PathParams, never, DiffResponse>(
      `http://test.localhost:3000/api/commits/${BASE}/diff/${HEAD}`,
      () =>
        HttpResponse.json({
          commit_diff: {
            from_hash: BASE,
            to_hash: HEAD,
            package_metrics: {
              added: [],
              removed: [
                packageMetricsFixture({
                  package_name: "@demo/gone",
                  directory: "products/gone",
                  source_lines: 8,
                  test_files: 0,
                  test_lines: 0,
                }),
              ],
              changed: [
                {
                  before: packageMetricsFixture({
                    package_name: "@demo/keep",
                    directory: "products/keep",
                    source_lines: 10,
                  }),
                  after: packageMetricsFixture({
                    package_name: "@demo/keep",
                    directory: "products/keep",
                    source_lines: 20,
                    test_files: 1,
                    test_lines: 5,
                  }),
                },
              ],
            },
            exports: { added: [], removed: [] },
            test_cases: { added: [], removed: [] },
            db_schemas: {
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
