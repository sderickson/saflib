import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildNpmRunArgs,
  findOutermostWorkspaceRoot,
  formatNpmScriptCommand,
  indexWorkspacePackages,
  validateNpmScriptTarget,
} from "./npm-script-validation.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../../../");

describe("npm-script-validation", () => {
  it("finds the outermost workspace root from a nested package", () => {
    expect(findOutermostWorkspaceRoot(path.join(repoRoot, "daemon/service/http"))).toBe(
      repoRoot,
    );
  });

  it("indexes known workspace packages", () => {
    const packages = indexWorkspacePackages(repoRoot);
    expect(packages.get("@pathclerk/daemon-http")?.dir).toBe(
      path.join(repoRoot, "daemon/service/http"),
    );
    expect(packages.get("@pathclerk/daemon-http")?.scripts.test).toBe("vitest run");
  });

  it("builds npm run args with forwarded script args", () => {
    expect(buildNpmRunArgs("@pathclerk/daemon-http", "test", ["whatsapp"])).toEqual([
      "run",
      "test",
      "-w",
      "@pathclerk/daemon-http",
      "--",
      "whatsapp",
    ]);
  });

  it("formats npm script commands for checklists", () => {
    expect(
      formatNpmScriptCommand("@pathclerk/daemon-http", "test", ["whatsapp"]),
    ).toBe("npm run test -w @pathclerk/daemon-http -- whatsapp");
  });

  it("accepts a valid workspace and script", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: "@pathclerk/daemon-http",
        script: "test",
        startDir: path.join(repoRoot, "daemon/plans"),
        runMode: "dry",
      }),
    ).not.toThrow();
  });

  it("throws for an unknown workspace", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: "@pathclerk/daemon-service-http",
        script: "test",
        startDir: repoRoot,
        runMode: "dry",
      }),
    ).toThrow(/workspace "@pathclerk\/daemon-service-http" not found/);
  });

  it("throws for a missing script", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: "@pathclerk/daemon-http",
        script: "typoo",
        startDir: repoRoot,
        runMode: "dry",
      }),
    ).toThrow(/script "typoo" not found/);
  });
});
