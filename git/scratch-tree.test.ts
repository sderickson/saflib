import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { writeBlob } from "./write-blob.ts";
import { commitTree } from "./commit-tree.ts";
import {
  openScratchIndex,
  setIndexEntry,
  writeScratchTree,
  closeScratchIndex,
} from "./scratch-tree.ts";
import { readBlob } from "./read-blob.ts";
import { listTree } from "./list-tree.ts";

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();
}

describe("scratch commit-building plumbing", () => {
  let repoRoot: string;
  let baseHash: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "saflib-git-scratch-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);

    writeFileSync(join(repoRoot, "a.txt"), "alpha\n");
    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "src/b.ts"), "export const b = 1;\n");
    git(repoRoot, ["add", "-A"]);
    git(repoRoot, ["commit", "-m", "base"]);
    baseHash = git(repoRoot, ["rev-parse", "HEAD"]);
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("builds a new commit from a changed blob without touching the real index/working tree", () => {
    const { result: scratch, error: openError } = openScratchIndex(repoRoot, baseHash);
    expect(openError).toBeUndefined();

    const { result: newBlobHash, error: blobError } = writeBlob(
      repoRoot,
      "export const b = 2;\n",
    );
    expect(blobError).toBeUndefined();

    const { error: setError } = setIndexEntry(scratch!, "src/b.ts", newBlobHash!);
    expect(setError).toBeUndefined();

    const { result: treeHash, error: treeError } = writeScratchTree(scratch!);
    expect(treeError).toBeUndefined();

    const { result: newCommitHash, error: commitError } = commitTree(
      repoRoot,
      treeHash!,
      baseHash,
      "preview",
    );
    expect(commitError).toBeUndefined();

    // The new commit's tree reflects the change...
    const { result: newContent } = readBlob(repoRoot, newBlobHash!);
    expect(newContent).toBe("export const b = 2;\n");
    const { result: tree } = listTree(repoRoot, newCommitHash!);
    const bEntry = tree!.find((e) => e.path === "src/b.ts");
    expect(bEntry?.blobHash).toBe(newBlobHash);
    // ...and the untouched file carried over unchanged.
    const aEntry = tree!.find((e) => e.path === "a.txt");
    expect(aEntry).toBeDefined();

    // The real repo's own HEAD/working tree/index were never touched.
    expect(git(repoRoot, ["rev-parse", "HEAD"])).toBe(baseHash);
    expect(git(repoRoot, ["status", "--porcelain"])).toBe("");

    closeScratchIndex(scratch!);
  });
});
