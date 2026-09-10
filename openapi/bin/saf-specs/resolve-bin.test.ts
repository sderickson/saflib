import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolvePackageBin } from "./resolve-bin.ts";

describe("resolvePackageBin", () => {
  it("prefers @saflib/openapi package root over the caller cwd", () => {
    const cwd = mkdtempSync(join(tmpdir(), "resolve-bin-cwd-"));
    const cwdPackageDir = join(cwd, "node_modules", "fake-cli");
    mkdirSync(cwdPackageDir, { recursive: true });
    writeFileSync(
      join(cwdPackageDir, "package.json"),
      JSON.stringify({ name: "fake-cli", bin: { "fake-cli": "cli.js" } }),
      "utf8",
    );
    writeFileSync(join(cwdPackageDir, "cli.js"), "", "utf8");

    const previousCwd = process.cwd();
    try {
      process.chdir(cwd);
      expect(resolvePackageBin("openapi-typescript")).toMatch(
        /openapi-typescript.*[\\/]bin[\\/]cli\.js$/,
      );
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("falls back to the caller workspace node_modules", () => {
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
      expect(realpathSync(resolvePackageBin("fake-cli"))).toBe(
        realpathSync(join(packageDir, "cli.js")),
      );
    } finally {
      process.chdir(previousCwd);
    }
  });
});
