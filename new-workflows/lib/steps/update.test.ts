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
