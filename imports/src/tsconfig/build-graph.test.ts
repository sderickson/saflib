import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildReferenceGraph,
  isGitIgnoredPackageDirectory,
  workspaceDepsOf,
} from "./build-graph.ts";

describe("buildReferenceGraph", () => {
  it("does not add devDependency workspace packages as project references", () => {
    const { graph } = buildReferenceGraph();
    for (const node of graph.values()) {
      expect(node.references).not.toContain("@saflib/playwright");
      expect(node.references).not.toContain("@saflib/vitest");
    }
  });

  it("includes tracked golden deploy package in the graph", () => {
    const { graph, skippedMeta } = buildReferenceGraph();
    const deployDir = path.join(import.meta.dirname, "../../../deploy");
    if (!fs.existsSync(path.join(deployDir, "package.json"))) {
      return; // artifact absent — same as CI
    }
    expect(isGitIgnoredPackageDirectory(deployDir)).toBe(false);
    expect(skippedMeta).not.toContain("@__organization-name__/deploy");
    expect([...graph.keys()]).toContain("@__organization-name__/deploy");
  });
});

describe("isGitIgnoredPackageDirectory", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  it("is false outside a git repo", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saf-nogit-"));
    tempDirs.push(dir);
    expect(isGitIgnoredPackageDirectory(dir)).toBe(false);
  });

  it("detects directories ignored by .gitignore", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "saf-gitign-"));
    tempDirs.push(root);
    spawnSync("git", ["init"], { cwd: root, encoding: "utf8" });
    fs.writeFileSync(path.join(root, ".gitignore"), "/deploy/\n");
    const deploy = path.join(root, "deploy");
    fs.mkdirSync(deploy);
    fs.writeFileSync(path.join(deploy, "package.json"), "{}");
    expect(isGitIgnoredPackageDirectory(deploy)).toBe(true);
    expect(isGitIgnoredPackageDirectory(root)).toBe(false);
  });
});

describe("workspaceDepsOf", () => {
  it("lists only workspace dependencies, not devDependencies", () => {
    const packages = new Set([
      "@saflib/playwright",
      "@saflib/utils",
      "@saflib/vitest",
    ]);
    const deps = workspaceDepsOf(
      {
        name: "@test/pkg",
        devDependencies: {
          "@saflib/playwright": "*",
          "@saflib/vitest": "*",
        },
        dependencies: { "@saflib/utils": "*" },
      },
      packages,
    );
    expect(deps).toEqual(["@saflib/utils"]);
  });
});
