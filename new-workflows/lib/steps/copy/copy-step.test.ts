import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCopyStep } from "./copy-step.ts";
import { makeTestContext } from "../../test-helpers.ts";
import { makeLineReplace } from "../../templating.ts";

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

  it("by default, does not nest under a directory every template file shares", async () => {
    // Auto-detected behavior (no `templateRoot` override): when every
    // template file lives directly inside the same directory, that
    // directory is treated as the root and *not* reconstructed under
    // `targetDir` — the right default for workflows like `monorepo/
    // add-package` or `commander/add-command`, whose own `context()`
    // already resolves `targetDir` to the exact destination and expect
    // zero extra reconstruction from the copy step.
    const sourceDir = mkdtempSync(path.join(tmpdir(), "copy-step-source-"));
    const groupDir = path.join(sourceDir, "__group-name__");
    mkdirSync(groupDir);
    const filePath = path.join(groupDir, "a.ts");
    const testPath = path.join(groupDir, "b.ts");
    writeFileSync(filePath, "export const a = 1;\n");
    writeFileSync(testPath, "export const b = 1;\n");
    const targetDir = mkdtempSync(path.join(tmpdir(), "copy-step-target-"));
    const { ctx } = makeTestContext({ mode: "run" });

    const result = await runCopyStep({ templateFiles: { file: filePath, test: testPath }, targetDir }, ctx);

    expect(result.status).toBe("success");
    expect(existsSync(path.join(targetDir, "a.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "b.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "__group-name__"))).toBe(false);
  });

  it("templateRoot overrides the auto-detected shared prefix to preserve a variable directory segment", async () => {
    // Reproduces `monorepo/add-export`: both template files live directly
    // inside a `__group-name__` dir, with nothing anchored a level above
    // it (unlike `drizzle/add-query`, which also has sibling `types.ts`/
    // `errors.ts` one level up from its own `__group-name__` dir) — the
    // auto-detected shared prefix lands ON `__group-name__` itself,
    // silently dropping it from the output path. There's no reliable way
    // to auto-detect this is wanted here but not for `add-package`/
    // `add-command` (tried a "climb to the nearest package.json" heuristic
    // — it broke both of those, since their templates sit identically deep
    // under the same kind of package.json-rooted tree but want *zero*
    // reconstruction), so it's an explicit per-workflow opt-in instead.
    const sourceRoot = mkdtempSync(path.join(tmpdir(), "copy-step-source-"));
    const groupDir = path.join(sourceRoot, "__group-name__");
    mkdirSync(groupDir);
    const filePath = path.join(groupDir, "__target-name__.ts");
    const testPath = path.join(groupDir, "__target-name__.test.ts");
    writeFileSync(filePath, "export const templateFile = 1;\n");
    writeFileSync(testPath, "import { templateFile } from './template-file.ts';\n");
    const targetDir = mkdtempSync(path.join(tmpdir(), "copy-step-target-"));
    const { ctx } = makeTestContext({ mode: "run" });

    // `__group-name__`/`__target-name__` placeholders (in both file *names*
    // and, via `intermediaryDir`, path segments) are only substituted
    // through `lineReplace` — real workflows always pass `makeLineReplace
    // (context)` (see `add-export.ts`), so build one here too rather than
    // relying on the separate `name:` (`template-file`-style) substitution.
    const lineReplace = makeLineReplace({ groupName: "lib", targetName: "my-function" });

    const result = await runCopyStep(
      {
        templateFiles: { file: filePath, test: testPath },
        targetDir,
        name: "my-function",
        lineReplace,
        templateRoot: sourceRoot,
      },
      ctx,
    );

    expect(result.status).toBe("success");
    expect(existsSync(path.join(targetDir, "my-function.ts"))).toBe(false);
    expect(existsSync(path.join(targetDir, "lib", "my-function.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "lib", "my-function.test.ts"))).toBe(true);
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
