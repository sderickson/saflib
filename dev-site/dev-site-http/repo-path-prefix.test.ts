import { describe, expect, it } from "vitest";
import { matchesPathPrefix } from "./repo-path-prefix.ts";

describe("matchesPathPrefix", () => {
  it("matches exact, descendants, and file-stem siblings", () => {
    const prefix =
      "product/clients/app/pages/home/settings/CommunicationsPage";
    expect(matchesPathPrefix(`${prefix}.vue`, prefix)).toBe(true);
    expect(matchesPathPrefix(`${prefix}.loader.ts`, prefix)).toBe(true);
    expect(matchesPathPrefix(`${prefix}.test.ts`, prefix)).toBe(true);
    expect(matchesPathPrefix(`${prefix}/nested.ts`, prefix)).toBe(true);
    expect(matchesPathPrefix(prefix, prefix)).toBe(true);
    expect(matchesPathPrefix(`${prefix}Async.vue`, prefix)).toBe(false);
    expect(matchesPathPrefix(`${prefix}Bar.ts`, prefix)).toBe(false);
  });

  it("still treats directory prefixes as descendants", () => {
    expect(matchesPathPrefix("docs/guide.md", "docs")).toBe(true);
    expect(matchesPathPrefix("docs", "docs")).toBe(true);
    expect(matchesPathPrefix("docs.md", "docs")).toBe(true);
    expect(matchesPathPrefix("other/docs/guide.md", "docs")).toBe(false);
  });
});
