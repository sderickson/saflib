import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getBuildInfo,
  getGitHashes,
  listBuildInfos,
  readCheckoutHead,
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

describe("dev worktree hashes", () => {
  const ROOT_SHA = "a".repeat(40);
  const SAFLIB_SHA = "b".repeat(40);
  let dir: string;
  const previous = process.env.SAF_GIT_WORKTREE;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "saflib-worktree-"));
    // A product checkout: HEAD on a branch with a loose ref...
    mkdirSync(join(dir, ".git", "refs", "heads"), { recursive: true });
    writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(join(dir, ".git", "refs", "heads", "main"), `${ROOT_SHA}\n`);
    // ...and saflib as a submodule (`.git` file into .git/modules), detached.
    mkdirSync(join(dir, ".git", "modules", "saflib"), { recursive: true });
    writeFileSync(join(dir, ".git", "modules", "saflib", "HEAD"), `${SAFLIB_SHA}\n`);
    mkdirSync(join(dir, "saflib"));
    writeFileSync(join(dir, "saflib", ".git"), "gitdir: ../.git/modules/saflib\n");
    resetGitHashesCache();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.SAF_GIT_WORKTREE;
    else process.env.SAF_GIT_WORKTREE = previous;
    resetGitHashesCache();
  });

  it("reads HEAD from loose refs, submodule gitdirs and packed-refs", () => {
    expect(readCheckoutHead(dir)).toBe(ROOT_SHA);
    expect(readCheckoutHead(join(dir, "saflib"))).toBe(SAFLIB_SHA);
    rmSync(join(dir, ".git", "refs", "heads", "main"));
    writeFileSync(join(dir, ".git", "packed-refs"), `# pack-refs\n${ROOT_SHA} refs/heads/main\n`);
    expect(readCheckoutHead(dir)).toBe(ROOT_SHA);
  });

  it("prefers the mounted checkout when SAF_GIT_WORKTREE is set", () => {
    process.env.SAF_GIT_WORKTREE = dir;
    expect(getGitHashes()).toEqual({ root: ROOT_SHA, saflib: SAFLIB_SHA });
  });

  it("gives up quietly when the checkout's git dir isn't reachable", () => {
    writeFileSync(join(dir, "saflib", ".git"), "gitdir: /host/only/path\n");
    expect(readCheckoutHead(join(dir, "saflib"))).toBeUndefined();
  });
});
