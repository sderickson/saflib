import { describe, expect, it } from "vitest";
import { githubRepo, releasesUrl, repositoryUrl, tagVersion } from "./changelog.ts";

describe("changelog helpers", () => {
  it("normalizes npm repository fields", () => {
    expect(repositoryUrl("git+https://github.com/a/b.git")).toBe("https://github.com/a/b");
    expect(repositoryUrl({ url: "git://github.com/a/b.git" })).toBe("https://github.com/a/b");
    expect(repositoryUrl("git@github.com:a/b.git")).toBe("https://github.com/a/b");
    expect(repositoryUrl("github:a/b")).toBe("https://github.com/a/b");
    expect(repositoryUrl("a/b")).toBe("https://github.com/a/b");
    expect(repositoryUrl("https://gitlab.com/a/b")).toBe("https://gitlab.com/a/b");
    expect(repositoryUrl(undefined)).toBeNull();
  });

  it("links GitHub releases, else npm versions", () => {
    expect(githubRepo("https://github.com/a/b")).toBe("a/b");
    expect(releasesUrl("x", "https://github.com/a/b")).toBe("https://github.com/a/b/releases");
    expect(releasesUrl("@s/x", null)).toBe("https://www.npmjs.com/package/@s/x?activeTab=versions");
  });

  it("reads versions from release tags for this package only", () => {
    expect(tagVersion("v1.2.3", "x")).toBe("1.2.3");
    expect(tagVersion("1.2.3", "x")).toBe("1.2.3");
    expect(tagVersion("@s/x@1.2.3", "@s/x")).toBe("1.2.3");
    expect(tagVersion("@s/other@1.2.3", "@s/x")).toBeNull();
    expect(tagVersion("nightly", "x")).toBeNull();
  });
});
