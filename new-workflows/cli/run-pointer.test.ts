import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readRunPointer, writeRunPointer } from "./run-pointer.ts";

describe("run pointer", () => {
  it("round-trips runId and idOrPath", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "run-pointer-"));
    writeRunPointer(dir, { runId: "run-1", idOrPath: "example/hello" });

    expect(readRunPointer(dir)).toEqual({ runId: "run-1", idOrPath: "example/hello" });
  });

  it("returns undefined when no pointer file exists", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "run-pointer-"));
    expect(readRunPointer(dir)).toBeUndefined();
  });
});
