import { describe, expect, it } from "vitest";
import { planImageCleanup } from "./cleanup.ts";
import { parseDockerTime, type LocalImage } from "./executor.ts";

const image = (
  repository: string,
  tag: string,
  createdAt: number,
  architecture = "arm64",
): LocalImage => ({
  repository,
  tag,
  id: `${tag}-${architecture}`,
  createdAt,
  architecture,
});

const tag = (n: number) => `in-${String(n).padStart(16, "0")}`;

describe("planImageCleanup", () => {
  it("keeps the newest per image and architecture, removing older ones with their registry copies", () => {
    const plan = planImageCleanup(
      [
        image("x-app", tag(1), 100),
        image("x-app", tag(2), 200),
        image("x-app", tag(3), 300),
        image("reg.io/me/x-app", tag(1), 100),
        image("x-app", tag(4), 50, "amd64"), // the only amd64 one survives
        image("x-app", "latest", 300),
        image("x-other", tag(9), 1), // not one of the requested images
      ],
      ["x-app"],
      2,
    );
    expect(plan.remove.sort()).toEqual([
      `reg.io/me/x-app:${tag(1)}`,
      `x-app:${tag(1)}`,
    ]);
    expect(plan.kept).toEqual({
      "x-app (arm64)": [tag(3), tag(2)],
      "x-app (amd64)": [tag(4)],
    });
  });

  it("never removes protected tags, even when older", () => {
    const plan = planImageCleanup(
      [
        image("x-app", tag(1), 100),
        image("x-app", tag(2), 200),
        image("x-app", tag(3), 300),
      ],
      ["x-app"],
      1,
      new Set([tag(1)]),
    );
    expect(plan.remove).toEqual([`x-app:${tag(2)}`]);
  });
});

describe("parseDockerTime", () => {
  it("parses docker's CreatedAt format", () => {
    expect(parseDockerTime("2026-10-07 11:52:31 -0700 PDT")).toBe(
      Date.parse("2026-10-07T18:52:31Z"),
    );
    expect(parseDockerTime("garbage")).toBeNaN();
  });
});
