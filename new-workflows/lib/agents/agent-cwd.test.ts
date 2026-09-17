import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { makeTestContext } from "../test-helpers.ts";
import { executePromptWithClaude } from "./claude-agent.ts";
import { executePromptWithCursor } from "./cursor-agent.ts";

// Regression: both adapters used to omit `cwd` from their `spawn(...)`
// options entirely, so the agent CLI ran in the dev-site *server's* own
// process directory instead of the run's actual working directory — e.g.
// a workflow updating a file under `/repo/test-product/...` had its agent
// process actually running from `/app/saflib/dev-site/dev-site-docker/
// service/http`, not even the right git repo. Silent for a `-p`-with-
// absolute-path prompt (the file itself is still reachable), but breaks
// anything relative: `git` commands, npm scripts, relative tool calls.
//
// This repo's test setup runs with `isolate: false` (shared module
// registry across files, for speed — see base-vitest.config.js) and
// deliberately avoids `vi.mock` for exactly that reason. So rather than
// mocking `node:child_process`, this puts a real fake executable on
// `PATH` that just records its own `pwd` — the most direct way to prove
// what `cwd` the real `spawn()` call actually used.

const originalPath = process.env.PATH;

afterEach(() => {
  process.env.PATH = originalPath;
});

/** A fake CLI that writes its own cwd to `outFile`, then emits one valid NDJSON result line. */
function installFakeCli(name: string, outFile: string): string {
  const binDir = mkdtempSync(path.join(tmpdir(), "agent-cwd-bin-"));
  const scriptPath = path.join(binDir, name);
  writeFileSync(
    scriptPath,
    `#!/bin/sh\npwd > "${outFile}"\necho '{"type":"result","is_error":false}'\n`,
  );
  chmodSync(scriptPath, 0o755);
  process.env.PATH = `${binDir}:${originalPath}`;
  return binDir;
}

describe("agent adapters pass the run's cwd to the spawned CLI", () => {
  it("executePromptWithClaude", async () => {
    const runCwd = mkdtempSync(path.join(tmpdir(), "agent-cwd-run-"));
    const outFile = path.join(mkdtempSync(path.join(tmpdir(), "agent-cwd-out-")), "cwd.txt");
    installFakeCli("claude", outFile);
    const { ctx } = makeTestContext({ mode: "run", cwd: runCwd });

    await executePromptWithClaude("do the thing", ctx);

    expect(readFileSync(outFile, "utf-8").trim()).toBe(realpathSync(runCwd));
  });

  it("executePromptWithCursor", async () => {
    const runCwd = mkdtempSync(path.join(tmpdir(), "agent-cwd-run-"));
    const outFile = path.join(mkdtempSync(path.join(tmpdir(), "agent-cwd-out-")), "cwd.txt");
    installFakeCli("cursor-agent", outFile);
    const { ctx } = makeTestContext({ mode: "run", cwd: runCwd });

    await executePromptWithCursor("do the thing", ctx);

    expect(readFileSync(outFile, "utf-8").trim()).toBe(realpathSync(runCwd));
  });
});
