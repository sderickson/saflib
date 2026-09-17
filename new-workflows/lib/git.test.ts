import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { commitIfDirty, revertUncommittedChanges } from "./git.ts";

const execFileAsync = promisify(execFile);

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "git-test-"));
  await execFileAsync("git", ["init"], { cwd: dir });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "hello\n");
  await execFileAsync("git", ["add", "-A"], { cwd: dir });
  await execFileAsync("git", ["commit", "-m", "initial"], { cwd: dir });
  return dir;
}

async function log(dir: string): Promise<string[]> {
  const { stdout } = await execFileAsync("git", ["log", "--format=%s"], { cwd: dir });
  return stdout.trim().split("\n").filter(Boolean);
}

describe("commitIfDirty", () => {
  it("commits new/modified files with the given message", async () => {
    const dir = await initRepo();
    writeFileSync(path.join(dir, "new-file.ts"), "export const x = 1;\n");

    const committed = await commitIfDirty(dir, "add new-file");

    expect(committed).toBe(true);
    expect(await log(dir)).toEqual(["add new-file", "initial"]);
  });

  it("is a no-op (returns false) when there's nothing to commit", async () => {
    const dir = await initRepo();

    const committed = await commitIfDirty(dir, "should not happen");

    expect(committed).toBe(false);
    expect(await log(dir)).toEqual(["initial"]);
  });

  it("is a no-op (returns false, does not throw) when cwd isn't a git repo at all", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "not-a-repo-"));
    writeFileSync(path.join(dir, "file.ts"), "x\n");

    await expect(commitIfDirty(dir, "message")).resolves.toBe(false);
  });

  it("treats a concurrent commit elsewhere in the same repo as success, not a failure", async () => {
    // Regression: this operates repo-wide (`git add -A` from the root), so
    // two callers racing on the *same* repo can have one's `git commit`
    // sweep up and commit the other's changes too — the loser's own
    // `git commit` then fails with "nothing to commit, working tree
    // clean" (a message git only prints to *stdout*, which `execFile`'s
    // error `.message` never includes). That's not a real failure; the
    // changes the loser cared about ARE committed, just not by it.
    const dir = await initRepo();
    writeFileSync(path.join(dir, "file-a.ts"), "export const a = 1;\n");
    writeFileSync(path.join(dir, "file-b.ts"), "export const b = 1;\n");

    const [resultA, resultB] = await Promise.all([
      commitIfDirty(dir, "commit A"),
      commitIfDirty(dir, "commit B"),
    ]);

    expect(resultA).toBe(true);
    expect(resultB).toBe(true);
    const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], { cwd: dir });
    expect(status.trim()).toBe("");
    const { stdout: files } = await execFileAsync("git", ["ls-files"], { cwd: dir });
    expect(files).toContain("file-a.ts");
    expect(files).toContain("file-b.ts");
  });

  it("still throws (with the underlying git output, not just a bare 'Command failed') for a genuine commit failure", async () => {
    const dir = await initRepo();
    writeFileSync(path.join(dir, "file.ts"), "x\n");
    // A real, non-race rejection — the tree is still dirty afterward, so
    // the benign-race recovery above must not swallow this one.
    const hooksDir = path.join(dir, ".git", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(
      path.join(hooksDir, "pre-commit"),
      "#!/bin/sh\necho 'rejected by pre-commit hook' >&2\nexit 1\n",
      { mode: 0o755 },
    );

    await expect(commitIfDirty(dir, "message")).rejects.toThrow(/rejected by pre-commit hook/);
  });

  it("commits from any subdirectory, capturing the whole repo's changes", async () => {
    const dir = await initRepo();
    mkdirSync(path.join(dir, "sub"), { recursive: true });
    writeFileSync(path.join(dir, "top-level.ts"), "x\n");
    writeFileSync(path.join(dir, "sub", "nested.ts"), "y\n");

    const committed = await commitIfDirty(path.join(dir, "sub"), "add both files");

    expect(committed).toBe(true);
    const { stdout } = await execFileAsync("git", ["show", "--stat", "HEAD"], { cwd: dir });
    expect(stdout).toContain("top-level.ts");
    expect(stdout).toContain("sub/nested.ts");
  });
});

describe("revertUncommittedChanges", () => {
  it("discards uncommitted modifications and untracked files", async () => {
    const dir = await initRepo();
    writeFileSync(path.join(dir, "README.md"), "modified\n");
    writeFileSync(path.join(dir, "untracked.ts"), "x\n");

    await revertUncommittedChanges(dir);

    expect(readFileSync(path.join(dir, "README.md"), "utf-8")).toBe("hello\n");
    expect(existsSync(path.join(dir, "untracked.ts"))).toBe(false);
  });

  it("does not touch files already committed", async () => {
    const dir = await initRepo();
    writeFileSync(path.join(dir, "extra.ts"), "keep me\n");
    await commitIfDirty(dir, "add extra");
    writeFileSync(path.join(dir, "extra.ts"), "dirty change\n");

    await revertUncommittedChanges(dir);

    expect(readFileSync(path.join(dir, "extra.ts"), "utf-8")).toBe("keep me\n");
  });

  it("is a no-op (does not throw) when cwd isn't a git repo at all", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "not-a-repo-"));
    writeFileSync(path.join(dir, "file.ts"), "x\n");

    await expect(revertUncommittedChanges(dir)).resolves.toBeUndefined();
    expect(existsSync(path.join(dir, "file.ts"))).toBe(true);
  });
});
