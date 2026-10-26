import { describe, it, expect } from "vitest";
import { formatCommitTimings } from "./engine.ts";

describe("formatCommitTimings", () => {
  it("shows just the total for a quick commit", () => {
    expect(
      formatCommitTimings([
        { command: "status", ms: 300 },
        { command: "commit", ms: 450 },
      ]),
    ).toBe("(0.8s)");
  });

  it("names the slowest git command for a slow commit", () => {
    expect(
      formatCommitTimings([
        { command: "status", ms: 1200 },
        { command: "add", ms: 900 },
        { command: "commit", ms: 7900 },
      ]),
    ).toBe("(10.0s; slowest: commit 7.9s)");
  });
});
