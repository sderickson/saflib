import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCommandForDisplay, formatPathForDisplay } from "./utils.ts";

describe("formatPathForDisplay", () => {
  const base = "/product/saflib";

  it("leaves relative paths unchanged", () => {
    expect(formatPathForDisplay("./foo/bar.ts", base)).toBe("./foo/bar.ts");
  });

  it("relativizes absolute paths under the workflow cwd", () => {
    expect(formatPathForDisplay("/product/saflib/product/workflows/init.ts", base)).toBe(
      "product/workflows/init.ts",
    );
  });

  it("uses .. segments for paths outside the workflow cwd", () => {
    expect(
      formatPathForDisplay("/product/saflib/monorepo/bin/lock-prune-run.ts", "/product/saflib/analytics/http"),
    ).toBe("../../monorepo/bin/lock-prune-run.ts");
  });
});

describe("formatCommandForDisplay", () => {
  it("relativizes absolute path arguments only", () => {
    const base = "/product/saflib/analytics/http";
    const display = formatCommandForDisplay(
      "node",
      [
        "--experimental-strip-types",
        "/product/saflib/product/workflows/init.ts",
        "/product/saflib/analytics/http/foo",
      ],
      base,
    );
    expect(display).toBe(
      `node --experimental-strip-types ../../product/workflows/init.ts foo`,
    );
  });
});
