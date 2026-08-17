import { describe, expect, it } from "vitest";
import {
  extractLeadingJsDocProse,
  parsePackageDescription,
  pickScopeDocFile,
  scopeDocListPrefix,
  shortenMarkdownSummary,
  summarizeScopeDoc,
} from "./scope-docs.ts";

describe("scopeDocListPrefix", () => {
  it("uses README stem for directories and the module stem for files", () => {
    expect(
      scopeDocListPrefix({
        kind: "dir",
        pkgPrefix: "pkg",
        localPath: "pages",
        moduleStem: "pages",
      }),
    ).toBe("pkg/pages/README");
    expect(
      scopeDocListPrefix({
        kind: "file",
        pkgPrefix: "pkg",
        localPath: "pages/Home.vue",
        moduleStem: "pages/Home",
      }),
    ).toBe("pkg/pages/Home");
    expect(
      scopeDocListPrefix({
        kind: "all",
        pkgPrefix: "pkg",
        localPath: "",
        moduleStem: "",
      }),
    ).toBe("");
  });
});

describe("pickScopeDocFile", () => {
  it("prefers the primary source over companions and tests", () => {
    const prefix = "pages/Home";
    const picked = pickScopeDocFile(
      [
        { path: "pages/Home.loader.ts" },
        { path: "pages/Home.test.ts" },
        { path: "pages/Home.vue" },
        { path: "pages/Home.strings.ts" },
      ],
      prefix,
    );
    expect(picked?.path).toBe("pages/Home.vue");
  });

  it("falls back to a colocated test when no primary source exists", () => {
    const prefix = "pkg/a";
    const picked = pickScopeDocFile(
      [{ path: "pkg/a.test.ts" }, { path: "pkg/a.loader.ts" }],
      prefix,
    );
    expect(picked?.path).toBe("pkg/a.test.ts");
  });
});

describe("summarizeScopeDoc", () => {
  it("extracts leading JSDoc", () => {
    expect(
      summarizeScopeDoc({
        path: "a.ts",
        content: "/** Hello there. */\nexport const x = 1;\n",
      }),
    ).toBe("Hello there.");
  });
});

describe("extractLeadingJsDocProse", () => {
  it("joins the first JSDoc paragraph", () => {
    const src = `/**
 * Overflow allocation for supplemental Additional Information pages.
 * Starts a new page copy when entries are exhausted.
 *
 * @param layout - unused in prose
 */
export function x() {}
`;
    expect(extractLeadingJsDocProse(src)).toBe(
      "Overflow allocation for supplemental Additional Information pages. Starts a new page copy when entries are exhausted.",
    );
  });

  it("ignores JSDoc that is not the first thing in the file", () => {
    const src = `import type { X } from "./x.ts";

export type Params = {
  /** Mid-file property doc — must not become the file summary. */
  effectiveTemplatePage?: number;
};

/**
 * Real export doc — also not file-scope.
 */
export function apply() {}
`;
    expect(extractLeadingJsDocProse(src)).toBeNull();
  });

  it("returns null when no JSDoc", () => {
    expect(extractLeadingJsDocProse("export const x = 1;\n")).toBeNull();
  });
});

describe("shortenMarkdownSummary", () => {
  it("uses title and first paragraph", () => {
    const md = `# Additional info overflow

Logic for packing dossier overflow onto USCIS Additional Information pages.

## Details
More stuff.
`;
    expect(shortenMarkdownSummary(md)).toBe(
      "Additional info overflow — Logic for packing dossier overflow onto USCIS Additional Information pages.",
    );
  });
});

describe("parsePackageDescription", () => {
  it("reads description", () => {
    expect(
      parsePackageDescription(
        JSON.stringify({ name: "@x/y", description: " Hello " }),
      ),
    ).toBe("Hello");
  });
});
