import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  runBranchName,
  syncIn,
  syncOut,
  toWorkspacePath,
  withWorkspace,
  type WorkflowWorkspaceConfig,
} from "./workspace.ts";
import { commitIfDirty } from "./git.ts";

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

async function initRepo(dir: string): Promise<void> {
  await git(dir, "init", "-q", "-b", "main");
  await git(dir, "config", "user.email", "test@example.com");
  await git(dir, "config", "user.name", "Test");
}

/** A checkout with one file and a `lib` submodule, plus a workspace config for it. */
async function setup(): Promise<{ host: string; config: WorkflowWorkspaceConfig; logs: string[] }> {
  const base = mkdtempSync(path.join(tmpdir(), "workspace-test-"));
  const libOrigin = path.join(base, "lib-origin");
  await execFileAsync("mkdir", ["-p", libOrigin]);
  await initRepo(libOrigin);
  writeFileSync(path.join(libOrigin, "lib.txt"), "lib v1\n");
  await git(libOrigin, "add", "-A");
  await git(libOrigin, "commit", "-q", "-m", "lib init");

  const host = path.join(base, "host");
  await execFileAsync("mkdir", ["-p", host]);
  await initRepo(host);
  writeFileSync(path.join(host, "app.txt"), "app v1\n");
  writeFileSync(path.join(host, ".gitignore"), "node_modules/\n");
  await git(host, "add", "-A");
  await git(host, "commit", "-q", "-m", "init");
  await git(host, "-c", "protocol.file.allow=always", "submodule", "add", "-q", libOrigin, "lib");
  await git(host, "commit", "-q", "-m", "add lib");
  await git(path.join(host, "lib"), "config", "user.email", "test@example.com");
  await git(path.join(host, "lib"), "config", "user.name", "Test");

  const logs: string[] = [];
  return {
    host,
    config: { hostRoot: host, root: path.join(base, "workspace", "repo"), installCommand: [] },
    logs,
  };
}

const logTo = (logs: string[]) => (chunk: { content: string }) => logs.push(chunk.content);

describe("workflow workspace", () => {
  it("carries the checkout's uncommitted changes in without touching the checkout", async () => {
    const { host, config, logs } = await setup();
    writeFileSync(path.join(host, "app.txt"), "app v1 edited\n");
    writeFileSync(path.join(host, "notes.md"), "new\n");
    writeFileSync(path.join(host, "lib", "lib.txt"), "lib edited\n");
    const statusBefore = await git(host, "status", "--porcelain");

    await syncIn(config, "run-1", logTo(logs));

    const ws = config.root;
    expect(readFileSync(path.join(ws, "app.txt"), "utf8")).toBe("app v1 edited\n");
    expect(readFileSync(path.join(ws, "notes.md"), "utf8")).toBe("new\n");
    expect(readFileSync(path.join(ws, "lib", "lib.txt"), "utf8")).toBe("lib edited\n");
    // Uncommitted in the workspace too.
    expect(await git(ws, "rev-parse", "HEAD")).toBe(await git(host, "rev-parse", "HEAD"));
    expect(await git(ws, "status", "--porcelain", "--ignore-submodules=dirty")).toContain("app.txt");
    // The checkout itself is untouched.
    expect(await git(host, "status", "--porcelain")).toBe(statusBefore);
  });

  it("fast-forwards the checkout's branch with the step's commits", async () => {
    const { host, config, logs } = await setup();
    writeFileSync(path.join(host, "plan.md"), "the plan\n");
    await syncIn(config, "run-2", logTo(logs));

    writeFileSync(path.join(config.root, "app.txt"), "app v2\n");
    expect(await commitIfDirty(config.root, "step 1")).toBe(true);
    await syncOut(config, "run-2", logTo(logs));

    expect(await git(host, "log", "-1", "--format=%s")).toBe("step 1");
    expect(await git(host, "rev-parse", "HEAD")).toBe(await git(config.root, "rev-parse", "HEAD"));
    // The step commit swept in the checkout's plan file (as committing in
    // place always has), and the checkout is clean afterwards.
    expect(await git(host, "show", "--name-only", "--format=", "HEAD")).toContain("plan.md");
    expect(readFileSync(path.join(host, "app.txt"), "utf8")).toBe("app v2\n");
    expect(await git(host, "status", "--porcelain")).toBe("");
    expect(logs.at(-1)).toContain("fast-forwarded main by 1 commit");
  });

  it("brings submodule changes back uncommitted", async () => {
    const { host, config, logs } = await setup();
    await syncIn(config, "run-3", logTo(logs));
    writeFileSync(path.join(config.root, "lib", "lib.txt"), "lib v2\n");
    writeFileSync(path.join(config.root, "lib", "added.txt"), "added\n");
    await commitIfDirty(config.root, "nothing to commit in the superproject");
    await syncOut(config, "run-3", logTo(logs));

    const hostLib = path.join(host, "lib");
    expect(readFileSync(path.join(hostLib, "lib.txt"), "utf8")).toBe("lib v2\n");
    expect(readFileSync(path.join(hostLib, "added.txt"), "utf8")).toBe("added\n");
    expect(await git(hostLib, "log", "--format=%s")).toBe("lib init");
    expect(await git(hostLib, "status", "--porcelain")).toContain("lib.txt");
    expect(await git(host, "log", "-1", "--format=%s")).toBe("add lib");
    expect(logs.at(-1)).toContain("2 uncommitted files in lib");
  });

  it("keeps edits made in the checkout during the advance", async () => {
    const { host, config, logs } = await setup();
    await syncIn(config, "run-4", logTo(logs));
    writeFileSync(path.join(config.root, "app.txt"), "app v2\n");
    await commitIfDirty(config.root, "step");
    writeFileSync(path.join(host, "other.txt"), "user edit\n");
    await syncOut(config, "run-4", logTo(logs));

    expect(await git(host, "log", "-1", "--format=%s")).toBe("step");
    expect(readFileSync(path.join(host, "other.txt"), "utf8")).toBe("user edit\n");
    expect(await git(host, "status", "--porcelain")).toBe("?? other.txt");
  });

  it("puts commits on the run's branch when the checkout's branch moved, and waits for a merge", async () => {
    const { host, config, logs } = await setup();
    await syncIn(config, "run-5", logTo(logs));
    writeFileSync(path.join(config.root, "app.txt"), "app v2\n");
    await commitIfDirty(config.root, "run step");
    // Meanwhile the user commits on their branch.
    writeFileSync(path.join(host, "user.txt"), "u\n");
    await git(host, "add", "user.txt");
    await git(host, "commit", "-q", "-m", "user commit");
    await syncOut(config, "run-5", logTo(logs));

    expect(await git(host, "log", "-1", "--format=%s")).toBe("user commit");
    expect(await git(host, "log", "-1", "--format=%s", runBranchName("run-5"))).toBe("run step");
    expect(logs.at(-1)).toContain(runBranchName("run-5"));

    await expect(syncIn(config, "run-5", logTo(logs))).rejects.toThrow(/isn't in your current branch/);
    await git(host, "merge", "-q", "--no-edit", runBranchName("run-5"));
    await expect(syncIn(config, "run-5", logTo(logs))).resolves.toBeUndefined();
  });

  it("maps checkout paths into the clone while active", async () => {
    const { host, config, logs } = await setup();
    expect(toWorkspacePath(path.join(host, "a"))).toBe(path.join(host, "a"));
    const mapped = await withWorkspace(config, "run-6", logTo(logs), async () => ({
      root: toWorkspacePath(host),
      nested: toWorkspacePath(path.join(host, "sub", "dir")),
      already: toWorkspacePath(path.join(config.root, "x")),
      outside: toWorkspacePath("/elsewhere"),
    }));
    expect(mapped).toEqual({
      root: config.root,
      nested: path.join(config.root, "sub", "dir"),
      already: path.join(config.root, "x"),
      outside: "/elsewhere",
    });
  });

  it("syncs out even when the step throws", async () => {
    const { host, config, logs } = await setup();
    await expect(
      withWorkspace(config, "run-7", logTo(logs), async () => {
        writeFileSync(path.join(config.root, "partial.txt"), "half done\n");
        throw new Error("step blew up");
      }),
    ).rejects.toThrow("step blew up");
    expect(existsSync(path.join(host, "partial.txt"))).toBe(true);
    expect(logs.at(-1)).toContain("1 uncommitted file in checkout");
  });

  it("merges with conflicting checkout edits and says so", async () => {
    const { host, config, logs } = await setup();
    await syncIn(config, "run-8", logTo(logs));
    writeFileSync(path.join(config.root, "app.txt"), "app from the run\n");
    writeFileSync(path.join(host, "app.txt"), "app from the user\n");
    await syncOut(config, "run-8", logTo(logs));

    expect(readFileSync(path.join(host, "app.txt"), "utf8")).toContain("<<<<<<<");
    expect(logs.at(-1)).toContain("check for conflict markers");
  });

  it("installs dependencies only when a lockfile changes", async () => {
    const { host, config, logs } = await setup();
    const counter = path.join(path.dirname(config.root), "installs.log");
    const installing = { ...config, installCommand: ["sh", "-c", `echo x >> ${counter}`] };
    writeFileSync(path.join(host, "package-lock.json"), "{}\n");
    await git(host, "add", "package-lock.json");
    await git(host, "commit", "-q", "-m", "lockfile");

    await syncIn(installing, "run-9", logTo(logs));
    await syncIn(installing, "run-9", logTo(logs));
    expect(readFileSync(counter, "utf8")).toBe("x\n");

    writeFileSync(path.join(host, "package-lock.json"), '{"changed": true}\n');
    await git(host, "commit", "-q", "-am", "bump lockfile");
    await syncIn(installing, "run-9", logTo(logs));
    expect(readFileSync(counter, "utf8")).toBe("x\nx\n");
  });

  it("retries a failed sync out before the next sync in", async () => {
    const { host, config, logs } = await setup();
    await syncIn(config, "run-10", logTo(logs));
    writeFileSync(path.join(config.root, "result.txt"), "work\n");
    // Simulate a sync out that died partway: the marker is left behind.
    writeFileSync(path.join(config.root, ".git", "saf-workspace.json"), JSON.stringify({ pendingSyncOutRunId: "run-10" }));

    await syncIn(config, "run-10", logTo(logs));

    expect(readFileSync(path.join(host, "result.txt"), "utf8")).toBe("work\n");
    expect(logs.some((l) => l.includes("Retrying the last sync"))).toBe(true);
    // And the workspace now carries it back in as the checkout's own change.
    expect(readFileSync(path.join(config.root, "result.txt"), "utf8")).toBe("work\n");
  });
});
