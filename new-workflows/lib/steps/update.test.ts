import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runUpdateStep } from "./update.ts";
import { makeTestContext } from "../test-helpers.ts";

describe("runUpdateStep", () => {
  it("errors when the fileId isn't in copiedFiles", async () => {
    const { ctx } = makeTestContext({ mode: "run" });
    const result = await runUpdateStep({ fileId: "missing" }, ctx);
    expect(result.status).toBe("error");
  });

  it("skips entirely in script mode", async () => {
    const { ctx } = makeTestContext({
      mode: "script",
      copiedFiles: { file: "/does/not/matter.ts" },
    });
    const result = await runUpdateStep({ fileId: "file" }, ctx);
    expect(result.status).toBe("success");
  });

  it("succeeds in run mode once the agent leaves no TODOs", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "export const x = 1;\n");
    const { ctx } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result).toEqual({ status: "success", result: { filePath } });
  });

  it("succeeds in run mode when the file just mentions lowercase 'todo' as product vocabulary, not a marker", async () => {
    // Regression: a todo-list app's own generated code legitimately says
    // "todo" constantly (`// the todo table`, `interface Todo`, etc.) —
    // the TODO-marker check must not fire on that, only on an actual caps
    // `TODO` comment.
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "// the todo table needs a title column\nexport interface Todo {}\n");
    const { ctx } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result).toEqual({ status: "success", result: { filePath } });
  });

  it("errors after 3 tries if TODOs are never removed (mock agent never edits the file)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "// TODO: implement\n");
    const { ctx } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result.status).toBe("error");
  });

  it("logs each TODO-retry prompt as its own agent-input entry, not silently", async () => {
    // Regression: the retry prompt was only ever handed to `runAgentTurn`,
    // never `ctx.log`'d — a TODO-triggered retry turn was invisible in the
    // log feed, indistinguishable from the agent's own initial turn just
    // continuing on its own.
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "// TODO: implement\n");
    const { ctx, chunks } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      copiedFiles: { file: filePath },
    });

    await runUpdateStep({ fileId: "file" }, ctx);

    const agentInputs = chunks.filter((c) => c.channel === "agent-input");
    // The initial prompt, plus one retry prompt per try (3 tries before
    // giving up) — each one logged, not just the first.
    expect(agentInputs.length).toBeGreaterThanOrEqual(4);
    expect(agentInputs.filter((c) => c.content.includes("contains TODO strings")).length).toBe(3);
  });

  it("in print mode, halts on first attempt and emits the prompt", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "export const x = 1;\n");
    const { ctx, chunks } = makeTestContext({
      mode: "print",
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result.status).toBe("awaiting_prompt");
    expect(chunks.some((c) => c.channel === "agent-input")).toBe(true);
  });

  it("in print mode, succeeds on resume once TODOs are gone", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "export const x = 1;\n");
    const { ctx } = makeTestContext({
      mode: "print",
      isResume: true,
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result).toEqual({ status: "success", result: { filePath } });
  });

  it("in print mode, re-halts on resume if TODOs are still present", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "// TODO: still here\n");
    const { ctx } = makeTestContext({
      mode: "print",
      isResume: true,
      copiedFiles: { file: filePath },
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result.status).toBe("awaiting_prompt");
  });

  it("skips the TODO check when skipTodos is set", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "update-step-"));
    const filePath = path.join(dir, "file.ts");
    writeFileSync(filePath, "// TODO: implement\n");
    const { ctx } = makeTestContext({
      mode: "run",
      agentConfig: { cli: "mock-agent" },
      copiedFiles: { file: filePath },
      skipTodos: true,
    });

    const result = await runUpdateStep({ fileId: "file" }, ctx);

    expect(result.status).toBe("success");
    expect(readFileSync(filePath, "utf-8")).toContain("TODO");
  });
});
