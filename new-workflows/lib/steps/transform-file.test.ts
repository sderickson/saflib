import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTransformFileStep } from "./transform-file.ts";
import { makeTestContext } from "../test-helpers.ts";

describe("runTransformFileStep", () => {
  it("applies the transform and writes the file back", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "transform-file-"));
    const filePath = path.join(dir, "data.json");
    writeFileSync(filePath, "1");
    const { ctx } = makeTestContext({ mode: "run", cwd: dir });

    const result = await runTransformFileStep(
      { filePath, transform: (c) => String(Number(c) + 1) },
      ctx,
    );

    expect(result.status).toBe("success");
    expect(readFileSync(filePath, "utf-8")).toBe("2");
  });

  it("skips writing in dry mode", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "transform-file-"));
    const filePath = path.join(dir, "data.json");
    writeFileSync(filePath, "1");
    const { ctx } = makeTestContext({ mode: "dry", cwd: dir });

    await runTransformFileStep({ filePath, transform: () => "changed" }, ctx);

    expect(readFileSync(filePath, "utf-8")).toBe("1");
  });

  it("skips missing files when skipIfMissing is set", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "transform-file-"));
    const filePath = path.join(dir, "missing.json");
    const { ctx } = makeTestContext({ mode: "run", cwd: dir });

    const result = await runTransformFileStep(
      { filePath, transform: () => "x", skipIfMissing: true },
      ctx,
    );

    expect(result.status).toBe("success");
  });
});
