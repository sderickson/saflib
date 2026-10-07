import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getBuildInfo,
  getGitHashes,
  listBuildInfos,
  resetGitHashesCache,
} from "./git-hashes.ts";

describe("build info", () => {
  let dir: string;
  const previous = process.env.SAF_BUILD_INFO_DIR;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "saflib-build-info-"));
    process.env.SAF_BUILD_INFO_DIR = dir;
    resetGitHashesCache();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.SAF_BUILD_INFO_DIR;
    else process.env.SAF_BUILD_INFO_DIR = previous;
    resetGitHashesCache();
  });

  it("reports the image's own commits from build.json", () => {
    writeFileSync(
      join(dir, "build.json"),
      JSON.stringify({
        image: "foo-monolith",
        commits: { root: "abc", saflib: "def-dirty" },
      }),
    );
    expect(getGitHashes()).toEqual({ root: "abc", saflib: "def-dirty" });
    expect(getBuildInfo()?.image).toBe("foo-monolith");
  });

  it("lists every build baked into the image", () => {
    mkdirSync(join(dir, "builds"));
    writeFileSync(
      join(dir, "builds", "b.json"),
      JSON.stringify({ image: "b" }),
    );
    writeFileSync(
      join(dir, "builds", "a.json"),
      JSON.stringify({ image: "a" }),
    );
    writeFileSync(join(dir, "builds", "notes.txt"), "ignored");
    expect(listBuildInfos().map((info) => info.image)).toEqual(["a", "b"]);
  });

  it("has no build info outside a saf-docker image", () => {
    expect(getBuildInfo()).toBeUndefined();
    expect(listBuildInfos()).toEqual([]);
    expect(getGitHashes().root).toMatch(/.+/);
  });
});
