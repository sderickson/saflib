import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  objectHashesAt,
  repoRootFor,
  treeHash,
  workingTreeHashes,
} from "./tree-hash.ts";

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

function makeRepo(): string {
  const repoRoot = realpathSync(
    mkdtempSync(join(tmpdir(), "saflib-git-tree-hash-")),
  );
  git(repoRoot, ["init", "-q", "-b", "main"]);
  writeFileSync(join(repoRoot, ".gitignore"), "dist/\n*.log\n");
  mkdirSync(join(repoRoot, "pkg-a/src"), { recursive: true });
  writeFileSync(join(repoRoot, "pkg-a/src/index.ts"), "export const a = 1;\n");
  mkdirSync(join(repoRoot, "pkg-b"));
  writeFileSync(join(repoRoot, "pkg-b/index.ts"), "export const b = 1;\n");
  git(repoRoot, ["add", "-A"]);
  git(repoRoot, ["commit", "-q", "-m", "base"]);
  return repoRoot;
}

describe("treeHash", () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = makeRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("returns the tree hash of a directory at a rev", () => {
    const { result, error } = treeHash(repoRoot, "HEAD", "pkg-a");
    expect(error).toBeUndefined();
    expect(result).toBe(git(repoRoot, ["rev-parse", "HEAD:pkg-a"]));
  });

  it("returns the root tree for an empty path", () => {
    const { result } = treeHash(repoRoot, "HEAD", "");
    expect(result).toBe(git(repoRoot, ["rev-parse", "HEAD^{tree}"]));
  });

  it("is stable across commits that don't touch the path, and returns to the same hash after a revert", () => {
    const before = treeHash(repoRoot, "HEAD", "pkg-a").result;

    writeFileSync(join(repoRoot, "pkg-b/index.ts"), "export const b = 2;\n");
    git(repoRoot, ["commit", "-q", "-am", "touch b"]);
    expect(treeHash(repoRoot, "HEAD", "pkg-a").result).toBe(before);

    writeFileSync(
      join(repoRoot, "pkg-a/src/index.ts"),
      "export const a = 2;\n",
    );
    git(repoRoot, ["commit", "-q", "-am", "touch a"]);
    expect(treeHash(repoRoot, "HEAD", "pkg-a").result).not.toBe(before);

    git(repoRoot, ["revert", "--no-edit", "HEAD"]);
    expect(treeHash(repoRoot, "HEAD", "pkg-a").result).toBe(before);
  });

  it("errors for a path that doesn't exist at the rev", () => {
    const { error } = treeHash(repoRoot, "HEAD", "nope");
    expect(error?.name).toBe("GitCommandError");
  });
});

describe("workingTreeHashes", () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = makeRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  const headHash = (p: string) => git(repoRoot, ["rev-parse", `HEAD:${p}`]);

  it("matches HEAD when the working tree is clean", () => {
    const { result, error } = workingTreeHashes(repoRoot, ["pkg-a", "pkg-b"]);
    expect(error).toBeUndefined();
    expect(result!.hashes).toEqual({
      "pkg-a": headHash("pkg-a"),
      "pkg-b": headHash("pkg-b"),
    });
    expect(result!.dirty).toBe(false);
    expect(result!.dirtyPaths).toEqual([]);
  });

  it("reflects modified tracked files, scoped to the affected path", () => {
    writeFileSync(
      join(repoRoot, "pkg-a/src/index.ts"),
      "export const a = 2;\n",
    );
    const { result } = workingTreeHashes(repoRoot, ["pkg-a", "pkg-b"]);
    expect(result!.hashes["pkg-a"]).not.toBe(headHash("pkg-a"));
    expect(result!.hashes["pkg-b"]).toBe(headHash("pkg-b"));
    expect(result!.dirtyPaths).toEqual(["pkg-a"]);
  });

  it("includes untracked files and ignores gitignored ones", () => {
    writeFileSync(join(repoRoot, "pkg-b/debug.log"), "noise\n");
    mkdirSync(join(repoRoot, "pkg-b/dist"));
    writeFileSync(join(repoRoot, "pkg-b/dist/out.js"), "built\n");
    expect(workingTreeHashes(repoRoot, ["pkg-b"]).result!.dirty).toBe(false);

    writeFileSync(join(repoRoot, "pkg-b/new.ts"), "export {};\n");
    expect(workingTreeHashes(repoRoot, ["pkg-b"]).result!.dirtyPaths).toEqual([
      "pkg-b",
    ]);
  });

  it("matches the hash the content will have once committed", () => {
    writeFileSync(
      join(repoRoot, "pkg-a/src/index.ts"),
      "export const a = 3;\n",
    );
    writeFileSync(join(repoRoot, "pkg-a/extra.ts"), "export {};\n");
    const working = workingTreeHashes(repoRoot, ["pkg-a"]).result!.hashes[
      "pkg-a"
    ];
    git(repoRoot, ["add", "-A"]);
    git(repoRoot, ["commit", "-q", "-m", "commit it"]);
    expect(working).toBe(headHash("pkg-a"));
  });

  it("reflects deleted files and fully deleted paths", () => {
    rmSync(join(repoRoot, "pkg-a/src/index.ts"));
    rmSync(join(repoRoot, "pkg-b"), { recursive: true });
    const { result, error } = workingTreeHashes(repoRoot, ["pkg-a", "pkg-b"]);
    expect(error).toBeUndefined();
    expect(result!.hashes["pkg-a"]).toBeNull(); // pkg-a now has no files
    expect(result!.hashes["pkg-b"]).toBeNull();
    expect(result!.dirtyPaths).toEqual(["pkg-a", "pkg-b"]);
  });

  it("returns null without error for paths that never existed or are ignored", () => {
    mkdirSync(join(repoRoot, "dist"));
    writeFileSync(join(repoRoot, "dist/x.js"), "x\n");
    const { result, error } = workingTreeHashes(repoRoot, [
      "missing",
      "dist",
      "pkg-b",
    ]);
    expect(error).toBeUndefined();
    expect(result!.hashes).toEqual({
      missing: null,
      dist: null,
      "pkg-b": headHash("pkg-b"),
    });
    expect(result!.dirty).toBe(false);
  });

  it("hashes individual files and the repo root", () => {
    writeFileSync(join(repoRoot, "pkg-b/index.ts"), "export const b = 9;\n");
    const { result } = workingTreeHashes(repoRoot, ["pkg-b/index.ts", ""]);
    expect(result!.hashes["pkg-b/index.ts"]).toBe(
      execFileSync("git", ["hash-object", "pkg-b/index.ts"], {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim(),
    );
    expect(result!.dirtyPaths).toEqual(["pkg-b/index.ts", ""]);
  });

  it("never touches the real index or working tree", () => {
    writeFileSync(join(repoRoot, "pkg-a/new.ts"), "export {};\n");
    writeFileSync(join(repoRoot, "pkg-b/index.ts"), "export const b = 5;\n");
    const statusBefore = git(repoRoot, ["status", "--porcelain"]);
    const indexBefore = readFileSync(join(repoRoot, ".git/index"));
    workingTreeHashes(repoRoot, ["pkg-a", "pkg-b"]);
    expect(git(repoRoot, ["status", "--porcelain"])).toBe(statusBefore);
    expect(readFileSync(join(repoRoot, ".git/index")).equals(indexBefore)).toBe(
      true,
    );
  });

  it("works in a repo with no commits yet", () => {
    const empty = realpathSync(
      mkdtempSync(join(tmpdir(), "saflib-git-tree-hash-empty-")),
    );
    try {
      git(empty, ["init", "-q"]);
      writeFileSync(join(empty, "a.txt"), "a\n");
      const { result, error } = workingTreeHashes(empty, ["a.txt"]);
      expect(error).toBeUndefined();
      expect(result!.hashes["a.txt"]).toMatch(/^[0-9a-f]{40}$/);
      expect(result!.dirty).toBe(true);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("objectHashesAt", () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = makeRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("looks up dirs, files, the root tree, and missing paths at a commit", () => {
    const { result, error } = objectHashesAt(repoRoot, "HEAD", [
      "pkg-a",
      "pkg-a/src/index.ts",
      "",
      "nope",
    ]);
    expect(error).toBeUndefined();
    expect(result!.get("pkg-a")).toBe(
      git(repoRoot, ["rev-parse", "HEAD:pkg-a"]),
    );
    expect(result!.get("pkg-a/src/index.ts")).toBe(
      git(repoRoot, ["rev-parse", "HEAD:pkg-a/src/index.ts"]),
    );
    expect(result!.get("")).toBe(git(repoRoot, ["rev-parse", "HEAD^{tree}"]));
    expect(result!.get("nope")).toBeNull();
  });

  it("returns a submodule's gitlink commit", () => {
    const sub = makeRepo();
    try {
      git(repoRoot, [
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        "-q",
        sub,
        "vendor/sub",
      ]);
      git(repoRoot, ["commit", "-q", "-m", "add sub"]);
      const { result } = objectHashesAt(repoRoot, "HEAD", ["vendor/sub"]);
      expect(result!.get("vendor/sub")).toBe(git(sub, ["rev-parse", "HEAD"]));
    } finally {
      rmSync(sub, { recursive: true, force: true });
    }
  });
});

describe("repoRootFor", () => {
  let repoRoot: string;
  beforeEach(() => {
    repoRoot = makeRepo();
  });
  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it("finds the enclosing repo for files, dirs, and not-yet-existing paths", () => {
    expect(repoRootFor(join(repoRoot, "pkg-a/src")).result).toBe(repoRoot);
    expect(repoRootFor(join(repoRoot, "pkg-a/src/index.ts")).result).toBe(
      repoRoot,
    );
    expect(repoRootFor(join(repoRoot, "pkg-a/does/not/exist")).result).toBe(
      repoRoot,
    );
  });

  it("returns the submodule root for paths inside a submodule", () => {
    const sub = makeRepo();
    try {
      git(repoRoot, [
        "-c",
        "protocol.file.allow=always",
        "submodule",
        "add",
        "-q",
        sub,
        "vendor/sub",
      ]);
      expect(repoRootFor(join(repoRoot, "vendor/sub/pkg-a")).result).toBe(
        join(repoRoot, "vendor/sub"),
      );
      expect(repoRootFor(join(repoRoot, "vendor")).result).toBe(repoRoot);
    } finally {
      rmSync(sub, { recursive: true, force: true });
    }
  });

  it("errors outside any repo", () => {
    const outside = mkdtempSync(join(tmpdir(), "saflib-git-no-repo-"));
    try {
      expect(repoRootFor(outside).error?.name).toBe("GitCommandError");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("workingTreeHashes racy-clean edits", () => {
  it("sees a same-size edit whose mtime matches the index's (git's racy-clean case)", () => {
    // Pin the file's and the real index's mtimes to the same second, as when
    // an edit lands in the same second the index was last written. Git
    // compares stat data at second granularity, so only the "entry is not
    // older than the index" racy check can catch this edit.
    const repoRoot = makeRepo();
    try {
      const file = join(repoRoot, "pkg-b/index.ts");
      const pinned = new Date("2020-01-01T00:00:00Z");
      utimesSync(file, pinned, pinned);
      git(repoRoot, ["update-index", "--refresh"]);
      utimesSync(join(repoRoot, ".git/index"), pinned, pinned);

      writeFileSync(file, "export const b = 2;\n"); // same size as `b = 1`
      utimesSync(file, pinned, pinned);
      expect(workingTreeHashes(repoRoot, ["pkg-b"]).result!.dirty).toBe(true);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
