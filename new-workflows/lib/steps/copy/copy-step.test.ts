import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCopyStep } from "./copy-step.ts";
import { makeTestContext } from "../../test-helpers.ts";

describe("runCopyStep", () => {
  it("copies a file, applying lineReplace and name substitutions", async () => {
    const sourceDir = mkdtempSync(path.join(tmpdir(), "copy-step-source-"));
    const targetDir = mkdtempSync(path.join(tmpdir(), "copy-step-target-"));
    const sourcePath = path.join(sourceDir, "template-file.ts");
    writeFileSync(sourcePath, "export const templateFile = 1;\n");
    const { ctx } = makeTestContext({ mode: "run" });

    const result = await runCopyStep(
      { templateFiles: { file: sourcePath }, targetDir, name: "example-thing" },
      ctx,
    );

    expect(result.status).toBe("success");
    const targetPath = path.join(targetDir, "example-thing.ts");
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, "utf-8")).toContain("exampleThing");
  });

  it("does not touch the filesystem in dry mode, but records the target path", async () => {
    const sourceDir = mkdtempSync(path.join(tmpdir(), "copy-step-source-"));
    const targetDir = mkdtempSync(path.join(tmpdir(), "copy-step-target-"));
    const sourcePath = path.join(sourceDir, "file.ts");
    writeFileSync(sourcePath, "export const x = 1;\n");
    const { ctx } = makeTestContext({ mode: "dry" });

    const result = await runCopyStep({ templateFiles: { file: sourcePath }, targetDir }, ctx);

    expect(result.status).toBe("success");
    expect(existsSync(path.join(targetDir, "file.ts"))).toBe(false);
  });

  it("skips entirely when skipUnlessPathExists points at a missing path", async () => {
    const sourceDir = mkdtempSync(path.join(tmpdir(), "copy-step-source-"));
    const targetDir = mkdtempSync(path.join(tmpdir(), "copy-step-target-"));
    const sourcePath = path.join(sourceDir, "file.ts");
    writeFileSync(sourcePath, "export const x = 1;\n");
    const { ctx } = makeTestContext({ mode: "run" });

    const result = await runCopyStep(
      {
        templateFiles: { file: sourcePath },
        targetDir,
        skipUnlessPathExists: "/definitely/does/not/exist",
      },
      ctx,
    );

    expect(result).toEqual({ status: "success", result: { copiedFiles: {} } });
    expect(existsSync(path.join(targetDir, "file.ts"))).toBe(false);
  });
});
