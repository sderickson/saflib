import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DbKey } from "@saflib/new-workflows-db";
import { newWorkflowsDbManager } from "@saflib/new-workflows-db/instances";
import { getByIdWorkflowRun } from "@saflib/new-workflows-db";
import { defineWorkflow, step, createRun, advanceRun } from "./engine.ts";
import { collectOutput } from "./output.ts";

// Regression: a container with no git identity configured (no
// user.name/user.email — exactly what happens when the host's git identity
// isn't forwarded into the container) makes `git commit` fail with "Author
// identity unknown". Previously that was just a `write({level: "error",
// ...})` log line inside `runStep`, and the run kept advancing to the next
// step on top of an ever-growing pile of uncommitted changes, defeating the
// whole point of committing after every step. `commitIfDirty` is mocked
// here (rather than reproducing a real failing `git commit`, which depends
// on OS-specific identity-fallback behavior — macOS's git happily falls
// back to the system username/hostname where Linux's doesn't) so this
// exercises `runStep`'s handling deterministically everywhere.
vi.mock("./git.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./git.ts")>()),
  commitIfDirty: vi.fn().mockRejectedValue(
    new Error("Command failed: git commit -m ...: fatal: unable to auto-detect email address"),
  ),
}));

async function initRepo(): Promise<string> {
  const dir = mkdtempSync(path.join(tmpdir(), "engine-commit-failure-"));
  return dir;
}

describe("advanceRun when the post-step commit fails", () => {
  let dbKey: DbKey;

  beforeAll(() => {
    dbKey = newWorkflowsDbManager.connect();
  });

  afterAll(() => {
    newWorkflowsDbManager.disconnect(dbKey);
  });

  beforeEach(() => {
    newWorkflowsDbManager.clearAllTablesForTests(dbKey);
  });

  it("fails the run (not just a log line) instead of silently continuing", async () => {
    const cwd = await initRepo();
    const definition = defineWorkflow<Record<string, unknown>, Record<string, unknown>>({
      id: "test/commit-failure",
      description: "test",
      context: ({ input }) => input,
      steps: [
        step(
          "command",
          async (_input, ctx) => {
            writeFileSync(path.join(ctx.cwd, "generated.ts"), "export const x = 1;\n");
            return { status: "success" };
          },
          () => ({ command: "true", args: [] }),
        ),
        step(
          "command",
          async () => ({ status: "success" }),
          () => ({ command: "true", args: [] }),
        ),
      ],
    });

    const runId = await createRun(dbKey, definition, { input: {}, cwd, mode: "run" });
    const { output, result } = advanceRun(dbKey, definition, runId);
    await collectOutput(output);
    const outcome = await result;

    expect(outcome.status).toBe("error");
    if (outcome.status === "error") {
      expect(outcome.message).toContain("failed to commit");
    }
    const { result: run } = await getByIdWorkflowRun(dbKey, { id: runId });
    // Must not have advanced past the step whose commit failed.
    expect(run?.current_step_index).toBe(0);
    expect(run?.status).toBe("failed");
  });
});
