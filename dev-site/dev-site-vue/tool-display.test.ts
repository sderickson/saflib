import { describe, it, expect } from "vitest";
import {
  formatToolInvocation,
  shortenRepoPath,
  splitToolResultSections,
} from "./tool-display.ts";

describe("formatToolInvocation", () => {
  it("formats Read with a repo path", () => {
    expect(
      formatToolInvocation("Read", {
        file_path: "/repo/my-product/service/sdk/foo.ts",
      }),
    ).toEqual({
      title: "Read",
      detail: "my-product/service/sdk/foo.ts",
      inputIsRedundant: true,
    });
  });

  it("formats Bash with command", () => {
    expect(formatToolInvocation("Bash", { command: "npm run test" })).toEqual({
      title: "Bash",
      detail: "npm run test",
    });
  });
});

describe("splitToolResultSections", () => {
  it("splits on ---markers---", () => {
    const content = `line one
---status---
on branch main
---diff stat main---
 foo | 1 +`;
    expect(splitToolResultSections(content)).toEqual([
      { label: "Output", body: "line one" },
      { label: "status", body: "on branch main" },
      { label: "diff stat main", body: "foo | 1 +" },
    ]);
  });
});

describe("shortenRepoPath", () => {
  it("strips /repo prefix", () => {
    expect(shortenRepoPath("/repo/foo/bar")).toBe("foo/bar");
  });
});
