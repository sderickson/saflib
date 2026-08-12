import { describe, it, expect } from "vitest";
import {
  hashExportIdentity,
  hashTestCaseIdentity,
  exportIdentityKey,
} from "./hashes.ts";

describe("hashes", () => {
  it("hashes export identity stably", () => {
    const a = hashExportIdentity({
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function",
    });
    const b = hashExportIdentity({
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function",
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(exportIdentityKey({
      packageName: "@saflib/git",
      filePath: "saflib/git/log.ts",
      name: "log",
      kind: "function",
    })).toContain("\0");
  });

  it("changes hash when kind differs", () => {
    const a = hashExportIdentity({
      packageName: "p",
      filePath: "f.ts",
      name: "x",
      kind: "function",
    });
    const b = hashExportIdentity({
      packageName: "p",
      filePath: "f.ts",
      name: "x",
      kind: "const",
    });
    expect(a).not.toBe(b);
  });

  it("hashes test-case identity stably", () => {
    const a = hashTestCaseIdentity({
      packageName: "p",
      filePath: "f.test.ts",
      fullName: "suite > case",
    });
    expect(a).toBe(
      hashTestCaseIdentity({
        packageName: "p",
        filePath: "f.test.ts",
        fullName: "suite > case",
      }),
    );
  });
});
