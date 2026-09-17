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
