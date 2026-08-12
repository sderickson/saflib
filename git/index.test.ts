import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  GitCommandError,
  isAncestor,
  listRefs,
  listTree,
  log,
  readBlob,
  readBlobs,
} from "./index.ts";

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

describe("@saflib/git", () => {
  let repoRoot: string;
  let commit1: string;
  let commit2: string;
  let commit3: string;

  beforeAll(() => {
    repoRoot = mkdtempSync(join(tmpdir(), "saflib-git-"));
    git(repoRoot, ["init"]);
    git(repoRoot, ["checkout", "-b", "main"]);

    writeFileSync(join(repoRoot, "a.txt"), "alpha\n");
    git(repoRoot, ["add", "a.txt"]);
    git(repoRoot, ["commit", "-m", "first: add a.txt"]);
    commit1 = git(repoRoot, ["rev-parse", "HEAD"]);

    mkdirSync(join(repoRoot, "src"));
    writeFileSync(join(repoRoot, "src/b.ts"), "export const b = 1;\n");
    git(repoRoot, ["add", "src/b.ts"]);
    git(repoRoot, ["commit", "-m", "second: add src/b.ts"]);
    commit2 = git(repoRoot, ["rev-parse", "HEAD"]);

    writeFileSync(join(repoRoot, "a.txt"), "alpha\nbeta\n");
    git(repoRoot, ["add", "a.txt"]);
    git(repoRoot, ["commit", "-m", "third: update a.txt"]);
    commit3 = git(repoRoot, ["rev-parse", "HEAD"]);
  });

  afterAll(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  describe("log", () => {
    it("returns commits newest-first (git log order)", () => {
      const { result, error } = log(repoRoot, { ref: "main" });
      expect(error).toBeUndefined();
      expect(result!.map((c) => c.hash)).toEqual([commit3, commit2, commit1]);
      expect(result![0].subject).toBe("third: update a.txt");
      expect(result![0].parentHashes).toEqual([commit2]);
      expect(result![2].parentHashes).toEqual([]);
      expect(result![0].authoredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("honors limit", () => {
      const { result, error } = log(repoRoot, { ref: "main", limit: 1 });
      expect(error).toBeUndefined();
      expect(result!).toHaveLength(1);
      expect(result![0].hash).toBe(commit3);
    });

    it("walks since..ref as an exclusive hash cursor", () => {
      const { result, error } = log(repoRoot, {
        ref: "main",
        since: commit1,
      });
      expect(error).toBeUndefined();
      expect(result!.map((c) => c.hash)).toEqual([commit3, commit2]);
    });

    it("returns GitCommandError for a missing ref", () => {
      const { result, error } = log(repoRoot, { ref: "no-such-ref" });
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(GitCommandError);
    });
  });

  describe("listTree", () => {
    it("lists path + blob hash for every file at a commit", () => {
      const { result, error } = listTree(repoRoot, commit2);
      expect(error).toBeUndefined();
      const byPath = Object.fromEntries(
        result!.map((e) => [e.path, e.blobHash]),
      );
      expect(Object.keys(byPath).sort()).toEqual(["a.txt", "src/b.ts"]);
      expect(byPath["a.txt"]).toMatch(/^[0-9a-f]{40}$/);
      expect(byPath["src/b.ts"]).toMatch(/^[0-9a-f]{40}$/);
    });

    it("reflects the tree at that commit, not HEAD", () => {
      const at1 = listTree(repoRoot, commit1);
      expect(at1.error).toBeUndefined();
      expect(at1.result!.map((e) => e.path)).toEqual(["a.txt"]);

      const at3 = listTree(repoRoot, commit3);
      expect(at3.error).toBeUndefined();
      expect(at3.result!.map((e) => e.path).sort()).toEqual([
        "a.txt",
        "src/b.ts",
      ]);
    });
  });

  describe("listRefs", () => {
    it("lists local branches", () => {
      const { result, error } = listRefs(repoRoot);
      expect(error).toBeUndefined();
      const main = result!.find((r) => r.name === "main" && r.type === "branch");
      expect(main?.hash).toBe(commit3);
    });
  });

  describe("isAncestor", () => {
    it("detects ancestry along first-parent history", () => {
      expect(isAncestor(repoRoot, commit1, commit3).result).toBe(true);
      expect(isAncestor(repoRoot, commit3, commit1).result).toBe(false);
      expect(isAncestor(repoRoot, commit2, commit2).result).toBe(true);
    });
  });

  describe("readBlob", () => {
    it("returns exact file contents for a blob hash", () => {
      const tree = listTree(repoRoot, commit3);
      expect(tree.error).toBeUndefined();
      const a = tree.result!.find((e) => e.path === "a.txt")!;
      const b = tree.result!.find((e) => e.path === "src/b.ts")!;

      const aContent = readBlob(repoRoot, a.blobHash);
      expect(aContent.error).toBeUndefined();
      expect(aContent.result).toBe("alpha\nbeta\n");

      const bContent = readBlob(repoRoot, b.blobHash);
      expect(bContent.error).toBeUndefined();
      expect(bContent.result).toBe("export const b = 1;\n");
    });

    it("returns the commit1 version of a.txt, not HEAD", () => {
      const tree = listTree(repoRoot, commit1);
      expect(tree.error).toBeUndefined();
      const a = tree.result!.find((e) => e.path === "a.txt")!;
      const { result, error } = readBlob(repoRoot, a.blobHash);
      expect(error).toBeUndefined();
      expect(result).toBe("alpha\n");
    });

    it("returns GitCommandError for a missing blob", () => {
      const { result, error } = readBlob(
        repoRoot,
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      );
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(GitCommandError);
    });
  });

  describe("readBlobs", () => {
    it("batch-reads multiple blobs", () => {
      const tree = listTree(repoRoot, commit3);
      const a = tree.result!.find((e) => e.path === "a.txt")!;
      const b = tree.result!.find((e) => e.path === "src/b.ts")!;
      const { result, error } = readBlobs(repoRoot, [
        a.blobHash,
        b.blobHash,
        a.blobHash,
      ]);
      expect(error).toBeUndefined();
      expect(result!.get(a.blobHash)).toBe("alpha\nbeta\n");
      expect(result!.get(b.blobHash)).toBe("export const b = 1;\n");
    });

    it("stays framed when blob contents include multi-byte UTF-8", () => {
      writeFileSync(join(repoRoot, "unicode.txt"), "café 日本語 🎉\n");
      git(repoRoot, ["add", "unicode.txt"]);
      git(repoRoot, ["commit", "-m", "unicode blob"]);
      const tip = git(repoRoot, ["rev-parse", "HEAD"]);
      const tree = listTree(repoRoot, tip);
      const uni = tree.result!.find((e) => e.path === "unicode.txt")!;
      const a = tree.result!.find((e) => e.path === "a.txt")!;
      const { result, error } = readBlobs(repoRoot, [uni.blobHash, a.blobHash]);
      expect(error).toBeUndefined();
      expect(result!.get(uni.blobHash)).toBe("café 日本語 🎉\n");
      expect(result!.get(a.blobHash)).toBe("alpha\nbeta\n");
    });
  });
});
