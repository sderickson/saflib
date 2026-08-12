import { describe, expect, it } from "vitest";
import {
  buildPackageDirTree,
  packageKindIcon,
} from "./package-dir-tree.ts";

describe("buildPackageDirTree", () => {
  it("stops at package roots and nests path segments", () => {
    const tree = buildPackageDirTree([
      {
        packageName: "@pathclerk/daemon-forms",
        directory: "daemon/forms",
      },
      {
        packageName: "@pathclerk/daemon-dev-site-http",
        directory: "daemon/dev-site/service/http",
      },
      {
        packageName: "@saflib/git",
        directory: "saflib/git",
      },
    ]);
    expect(tree.map((n) => n.label).sort()).toEqual(["daemon", "saflib"]);
    const daemon = tree.find((n) => n.label === "daemon")!;
    const forms = daemon.children.find((c) => c.label === "forms");
    expect(forms?.kind).toBe("package");
    expect(forms?.packageName).toBe("@pathclerk/daemon-forms");
    expect(forms?.packageKind).toBe("other");
  });
});

describe("packageKindIcon", () => {
  it("returns mdi icons per kind", () => {
    expect(packageKindIcon("http")).toContain("mdi-");
    expect(packageKindIcon("db")).toContain("mdi-");
  });
});
