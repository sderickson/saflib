import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildNpmRunArgs,
  findOutermostWorkspaceRoot,
  formatNpmScriptCommand,
  indexWorkspacePackages,
  validateNpmScriptTarget,
} from "./npm-script-validation.ts";

const fixtureRoot = path.join(import.meta.dirname, "npm-script-fixtures");
const childPackageDir = path.join(fixtureRoot, "packages/child");
const workspaceName = "@fixture/npm-script-child";

describe("npm-script-validation", () => {
  it("finds a workspace root that contains a nested package", () => {
    const root = findOutermostWorkspaceRoot(childPackageDir);
    const packages = indexWorkspacePackages(root);
    expect(packages.get(workspaceName)?.dir).toBe(childPackageDir);
  });

  it("indexes known workspace packages", () => {
    const packages = indexWorkspacePackages(fixtureRoot);
    expect(packages.get(workspaceName)?.dir).toBe(childPackageDir);
    expect(packages.get(workspaceName)?.scripts.test).toBe("echo test");
  });

  it("builds npm run args with forwarded script args", () => {
    expect(buildNpmRunArgs(workspaceName, "test", ["unit"])).toEqual([
      "run",
      "test",
      "-w",
      workspaceName,
      "--",
      "unit",
    ]);
  });

  it("formats npm script commands for checklists", () => {
    expect(formatNpmScriptCommand(workspaceName, "test", ["unit"])).toBe(
      `npm run test -w ${workspaceName} -- unit`,
    );
  });

  it("accepts a valid workspace and script", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: workspaceName,
        script: "test",
        startDir: path.join(fixtureRoot, "packages/nested"),
        runMode: "dry",
      }),
    ).not.toThrow();
  });

  it("throws for an unknown workspace", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: "@fixture/npm-script-missing",
        script: "test",
        startDir: fixtureRoot,
        runMode: "dry",
      }),
    ).toThrow(/workspace "@fixture\/npm-script-missing" not found/);
  });

  it("throws for a missing script", () => {
    expect(() =>
      validateNpmScriptTarget({
        workspace: workspaceName,
        script: "typoo",
        startDir: fixtureRoot,
        runMode: "dry",
      }),
    ).toThrow(/script "typoo" not found/);
  });
});
