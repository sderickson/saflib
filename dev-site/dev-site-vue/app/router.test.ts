import { describe, it, expect } from "vitest";
import { createDevSiteRouter } from "./router.ts";

describe("@saflib/dev-site-vue/app router", () => {
  it("creates hub / history / checkout / build routes", () => {
    const router = createDevSiteRouter();
    const paths = router.getRoutes().map((r) => r.path).sort();
    expect(paths).toEqual(
      [
        "/",
        "/build",
        "/checkout",
        "/checkout/packages/:packageName",
        "/commits/:hash",
        "/compare",
        "/history",
        "/history/commits/:hash",
        "/history/compare",
      ].sort(),
    );
  });
});
