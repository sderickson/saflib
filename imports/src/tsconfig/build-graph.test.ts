import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildReferenceGraph,
  isGitIgnoredPackageDirectory,
  listGitIgnoredPackageDirectories,
  workspaceDepsOf,
} from "./build-graph.ts";

describe("buildReferenceGraph", () => {
  it("does not add vitest/playwright when they are only in devDependencies", () => {
    const { graph, context } = buildReferenceGraph();
    for (const [name, node] of graph) {
      const pj = context.monorepoPackageJsons[name]!;
      const runtimeDeps = new Set(Object.keys(pj.dependencies ?? {}));
      // Harness packages (e.g. @saflib/security) may depend on playwright at
      // runtime; only forbid refs when the dep is test-only.
      if (!runtimeDeps.has("@saflib/playwright")) {
        expect(node.references).not.toContain("@saflib/playwright");
      }
      if (!runtimeDeps.has("@saflib/vitest")) {
        expect(node.references).not.toContain("@saflib/vitest");
      }
    }
  }, 15_000);

  it("includes tracked golden deploy package in the graph", () => {
    const { graph, skippedMeta } = buildReferenceGraph();
    const deployDir = path.join(import.meta.dirname, "../../../deploy");
    if (!fs.existsSync(path.join(deployDir, "package.json"))) {
      return; // artifact absent — same as CI
    }
    expect(isGitIgnoredPackageDirectory(deployDir)).toBe(false);
    expect(skippedMeta).not.toContain("@__organization-name__/deploy");
    expect([...graph.keys()]).toContain("@__organization-name__/deploy");
  }, 15_000);
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

  it("resolves subpath dependency keys to workspace package roots", () => {
    const packages = new Set(["@saflib/utils"]);
    const deps = workspaceDepsOf(
      {
        name: "@test/pkg",
        dependencies: { "@saflib/utils/telemetry-sanitize": "*" },
      },
      packages,
    );
    expect(deps).toEqual(["@saflib/utils"]);
  });
});

describe("listGitIgnoredPackageDirectories", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    while (tempDirs.length > 0) {
      fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

  const git = (cwd: string, ...args: string[]) =>
    spawnSync(
      "git",
      [
        "-c",
        "user.email=t@example.com",
        "-c",
        "user.name=t",
        "-c",
        "protocol.file.allow=always",
        ...args,
      ],
      { cwd, encoding: "utf8" },
    );

  it("still finds ignored dirs when some paths are inside a submodule", () => {
    // A library repo that becomes a submodule, with its own ignored dir.
    const lib = fs.mkdtempSync(path.join(os.tmpdir(), "saf-sublib-"));
    tempDirs.push(lib);
    git(lib, "init");
    fs.writeFileSync(path.join(lib, ".gitignore"), "/cache/\n");
    fs.mkdirSync(path.join(lib, "pkg"));
    fs.writeFileSync(path.join(lib, "pkg", "package.json"), "{}");
    git(lib, "add", ".");
    git(lib, "commit", "-m", "init");

    const root = fs.mkdtempSync(path.join(os.tmpdir(), "saf-subroot-"));
    tempDirs.push(root);
    git(root, "init");
    fs.writeFileSync(path.join(root, ".gitignore"), "/cache/\n");
    git(root, "submodule", "add", lib, "lib");
    for (const dir of ["cache", "app", "lib/cache"]) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }

    const dirs = ["cache", "app", "lib/pkg", "lib/cache"].map((d) =>
      path.join(root, d),
    );
    expect(listGitIgnoredPackageDirectories(root, dirs)).toEqual(
      new Set([path.join(root, "cache"), path.join(root, "lib/cache")]),
    );
  });
});
