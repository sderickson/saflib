import { describe, expect, it } from "vitest";
import {
  githubCompareUrl,
  resolveGithubSourceRef,
  sourceOpenUrls,
} from "./source-links.ts";

describe("resolveGithubSourceRef", () => {
  it("prefers the current branch, then commit, then fallback", () => {
    expect(
      resolveGithubSourceRef({
        branch: "feature/source-links",
        commitHash: "abc123",
        fallbackRef: "main",
      }),
    ).toBe("feature/source-links");
    expect(
      resolveGithubSourceRef({
        branch: null,
        commitHash: "abc123",
        fallbackRef: "main",
      }),
    ).toBe("abc123");
    expect(resolveGithubSourceRef({ branch: null, commitHash: null })).toBe(
      "main",
    );
  });
});

describe("sourceOpenUrls", () => {
  it("builds blob links on the resolved ref", () => {
    expect(
      sourceOpenUrls("workflows/core/utils.ts", {
        githubRepo: "acme/widget",
        githubRef: "feature/source-links",
        line: 15,
      }).github,
    ).toBe(
      "https://github.com/acme/widget/blob/feature/source-links/workflows/core/utils.ts#L15",
    );
    expect(
      sourceOpenUrls("README.md", {
        githubRepo: "acme/widget",
        commitHash: "deadbeef",
      }).github,
    ).toBe("https://github.com/acme/widget/blob/deadbeef/README.md");
  });
});

describe("githubCompareUrl", () => {
  it("links fork point to head", () => {
    expect(
      githubCompareUrl("acme/widget", "mergebase123", "feature/source-links"),
    ).toBe(
      "https://github.com/acme/widget/compare/mergebase123...feature/source-links",
    );
  });
});
