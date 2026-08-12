import { describe, expect, it } from "vitest";
import {
  adjacentSourcePaths,
  extractLeadingJsDocProse,
  fileScopeDocCandidates,
  parsePackageDescription,
  shortenMarkdownSummary,
} from "./scope-docs.ts";

describe("adjacentSourcePaths", () => {
  it("maps test stems to sibling sources", () => {
    expect(adjacentSourcePaths("forms/additional-info/foo.test.ts")).toContain(
      "forms/additional-info/foo.ts",
    );
  });
});

describe("fileScopeDocCandidates", () => {
  it("prefers adjacent source then the test file", () => {
    const c = fileScopeDocCandidates("pkg/a.test.ts");
    expect(c[0]).toBe("pkg/a.ts");
    expect(c.at(-1)).toBe("pkg/a.test.ts");
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
