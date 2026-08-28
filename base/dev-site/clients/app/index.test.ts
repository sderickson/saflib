import { describe, it, expect } from "vitest";
import { createDevSiteRouter } from "./router.ts";

describe("@saflib/base-dev-site-app", () => {
  it("creates a router with hub / history / checkout / build routes", () => {
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
