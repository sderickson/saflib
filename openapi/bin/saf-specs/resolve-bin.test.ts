import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolvePackageBin } from "./resolve-bin.ts";

describe("resolvePackageBin", () => {
  it("resolves from the caller workspace node_modules", () => {
    const cwd = mkdtempSync(join(tmpdir(), "resolve-bin-cwd-"));
    const packageDir = join(cwd, "node_modules", "fake-cli");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(
      join(packageDir, "package.json"),
      JSON.stringify({ name: "fake-cli", bin: { "fake-cli": "cli.js" } }),
      "utf8",
    );
    writeFileSync(join(packageDir, "cli.js"), "", "utf8");

    const previousCwd = process.cwd();
    try {
      process.chdir(cwd);
      expect(resolvePackageBin("fake-cli")).toBe(join(packageDir, "cli.js"));
    } finally {
      process.chdir(previousCwd);
    }
  });
});
