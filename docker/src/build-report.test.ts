import { describe, expect, it } from "vitest";
import type { BuildResult } from "./build-images.ts";
import { formatBuildReport } from "./build-report.ts";
import { progressBar, stepSummary } from "./reporter.ts";

const result = (overrides: Partial<BuildResult>): BuildResult => ({
  ref: "@x/a/builds/default",
  image: "x-a",
  tag: "in-abc",
  outcome: "built",
  durationMs: 12_300,
  dirty: false,
  ...overrides,
});

describe("formatBuildReport", () => {
  it("lists every image with steps, log and Docker Desktop link, then errors", () => {
    const report = formatBuildReport(
      [
        result({
          steps: { total: 9, cached: 6, executed: 3 },
          logFile: "/repo/.saf-docker/logs/x-a.log",
          detailsUrl: "docker-desktop://dashboard/build/a/b/c",
        }),
        result({ image: "x-b", outcome: "up-to-date", durationMs: 100 }),
        result({
          image: "x-c",
          outcome: "failed",
          error: "docker build failed",
          dirty: true,
        }),
      ],
      {
        startedAt: new Date("2026-10-06T00:00:00Z"),
        contextDir: "/repo",
        platform: "amd64",
        registry: "ghcr.io/me",
        push: true,
      },
    );
    expect(report).toContain("- Registry: ghcr.io/me (push)");
    expect(report).toContain("1 built, 1 up to date");
    expect(report).toContain(
      "| x-a | built | in-abc | 12.3s | 6 / 3 / 9 | /repo/.saf-docker/logs/x-a.log | docker-desktop://dashboard/build/a/b/c |",
    );
    expect(report).toContain(
      "| x-b | up-to-date | in-abc | 0.1s | — | — | — |",
    );
    expect(report).toContain("| x-c (dirty) | failed |");
    expect(report).toContain(
      "- **x-c** (@x/a/builds/default): docker build failed",
    );
  });
});

describe("progress display", () => {
  it("draws cached, rebuilt and pending steps distinctly", () => {
    expect(progressBar(undefined)).toBe("░".repeat(20));
    expect(
      progressBar({
        done: 6,
        total: 10,
        cached: 5,
        executed: 2,
        step: "RUN x",
      }),
    ).toBe("▒".repeat(10) + "█".repeat(4) + "░".repeat(6));
    expect(
      progressBar({ done: 3, total: 3, cached: 3, executed: 0, step: "" }),
    ).toBe("▒".repeat(20));
  });

  it("summarizes a finished build's steps", () => {
    expect(
      stepSummary(result({ steps: { total: 9, cached: 6, executed: 3 } })),
    ).toBe("9 steps: 6 cached, 3 rebuilt");
    expect(stepSummary(result({}))).toBe("");
  });
});
