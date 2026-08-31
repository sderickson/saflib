import { describe, expect, it } from "vitest";
import {
  buildPackageDirTree,
  packageKindIcon,
} from "./package-dir-tree.ts";

describe("buildPackageDirTree", () => {
  it("stops at package roots and nests path segments", () => {
    const tree = buildPackageDirTree([
      {
        package_name: "@example/billing-db",
        directory: "products/billing/service/db",
        kind: "db",
        debt_count: 2,
        issue_counts_by_kind: {
          "dead-code": 2,
          "oversized-file": 0,
          "package-layout": 0,
        },
      },
      {
        package_name: "@example/billing-http",
        directory: "products/billing/service/http",
      },
      {
        package_name: "@saflib/git",
        directory: "saflib/git",
      },
    ]);
    expect(tree.map((n) => n.label).sort()).toEqual(["products", "saflib"]);
    const products = tree.find((n) => n.label === "products")!;
    const billing = products.children.find((c) => c.label === "billing")!;
    expect(billing.kind).toBe("dir");
    const db = billing.children
      .find((c) => c.label === "service")!
      .children.find((c) => c.label === "db");
    expect(db?.kind).toBe("package");
    expect(db?.package_name).toBe("@example/billing-db");
    expect(db?.packageKind).toBe("db");
    expect(db?.debt_count).toBe(2);
  });
});

describe("packageKindIcon", () => {
  it("returns mdi icons per kind", () => {
    expect(packageKindIcon("http")).toContain("mdi-");
    expect(packageKindIcon("db")).toContain("mdi-");
  });
});
