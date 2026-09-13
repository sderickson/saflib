import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCdStep } from "./cd.ts";
import { makeTestContext } from "../test-helpers.ts";

describe("runCdStep", () => {
  it("succeeds when the target directory has a package.json (mode: run)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cd-step-"));
    writeFileSync(path.join(dir, "package.json"), "{}");
    const { ctx } = makeTestContext({ mode: "run", originalWorkingDirectory: dir });

    const result = await runCdStep({ path: dir }, ctx);

    expect(result).toEqual({ status: "success", result: { newCwd: dir } });
  });

  it("errors when the target directory has no package.json (mode: run)", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cd-step-"));
    const { ctx } = makeTestContext({ mode: "run", originalWorkingDirectory: dir });

    const result = await runCdStep({ path: dir }, ctx);

    expect(result.status).toBe("error");
  });

  it("skips validation in script mode even without a package.json", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cd-step-"));
    const { ctx } = makeTestContext({ mode: "script", originalWorkingDirectory: dir });

    const result = await runCdStep({ path: dir }, ctx);

    expect(result.status).toBe("success");
  });
});
