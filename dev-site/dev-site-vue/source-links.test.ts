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
        branch: "2026-08-26-integrations",
        commitHash: "abc123",
        fallbackRef: "main",
      }),
    ).toBe("2026-08-26-integrations");
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
      sourceOpenUrls("daemon/service/common/whatsapp-outbound.ts", {
        githubRepo: "PathClerk/pathclerk",
        githubRef: "feature/whatsapp",
        line: 15,
      }).github,
    ).toBe(
      "https://github.com/PathClerk/pathclerk/blob/feature/whatsapp/daemon/service/common/whatsapp-outbound.ts#L15",
    );
    expect(
      sourceOpenUrls("README.md", {
        githubRepo: "PathClerk/pathclerk",
        commitHash: "deadbeef",
      }).github,
    ).toBe("https://github.com/PathClerk/pathclerk/blob/deadbeef/README.md");
  });
});

describe("githubCompareUrl", () => {
  it("links fork point to head", () => {
    expect(
      githubCompareUrl(
        "PathClerk/pathclerk",
        "mergebase123",
        "2026-08-26-integrations",
      ),
    ).toBe(
      "https://github.com/PathClerk/pathclerk/compare/mergebase123...2026-08-26-integrations",
    );
  });
});
