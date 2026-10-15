import { describe, expect, it } from "vitest";
import { formatGitDiffCompareCommand } from "./compare-git-diff.ts";

describe("formatGitDiffCompareCommand", () => {
  it("formats a full-branch three-dot diff", () => {
    expect(
      formatGitDiffCompareCommand({
        baseRef: "f727b670bb7f7dda72a1f441cbee782d46940748",
        headRef: "2026-10-09-uscis-api",
      }),
    ).toBe(
      "git diff f727b670bb7f7dda72a1f441cbee782d46940748...2026-10-09-uscis-api",
    );
  });

  it("scopes with a path pathspec", () => {
    expect(
      formatGitDiffCompareCommand({
        baseRef: "main",
        headRef: "feature/foo",
        pathPrefix: "daemon/service/common/",
      }),
    ).toBe("git diff main...feature/foo -- daemon/service/common");
  });

  it("quotes paths with spaces", () => {
    expect(
      formatGitDiffCompareCommand({
        baseRef: "main",
        headRef: "feature",
        pathPrefix: "path with spaces/file.ts",
      }),
    ).toBe("git diff main...feature -- 'path with spaces/file.ts'");
  });
});
