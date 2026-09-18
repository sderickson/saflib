import { describe, it, expect } from "vitest";
import { createDevSiteRouter } from "./router.ts";

describe("@saflib/dev-site-vue/app router", () => {
  it("creates hub / history / checkout / plans routes", () => {
    const router = createDevSiteRouter();
    const paths = router.getRoutes().map((r) => r.path).sort();
    expect(paths).toEqual(
      [
        "/",
        "/build",
        "/checkout",
        "/checkout/packages/:package_name",
        "/commits/:hash",
        "/compare",
        "/history",
        "/history/commits/:hash",
        "/history/compare",
        "/plans",
        "/plans/:planName/:fileName(.+\\.md)",
        "/plans/:planName/:fileName(.+\\.ya?ml)",
        "/plans/:planName/:fileName",
        "/workflows",
        "/workflows/runs/:runId",
      ].sort(),
    );
  });
});
