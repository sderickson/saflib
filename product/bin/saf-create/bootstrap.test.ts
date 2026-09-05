import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildRootPackageJson,
  collisionPaths,
  ensureRootPackageJson,
  existingSaflibMessage,
  formatCollisionWarning,
  hasSaflibSubmodule,
  resolveOrganizationName,
  runBootstrap,
  validateProductName,
} from "./bootstrap.ts";

describe("validateProductName", () => {
  it("accepts kebab-case names", () => {
    expect(() => validateProductName("my-app")).not.toThrow();
  });

  it("rejects invalid names", () => {
    expect(() => validateProductName("My App")).toThrow(/Invalid product name/);
  });
});

describe("resolveOrganizationName", () => {
  it("defaults to the product name", () => {
    expect(resolveOrganizationName("demo")).toBe("demo");
  });

  it("uses --org when provided", () => {
    expect(resolveOrganizationName("demo", "acme")).toBe("acme");
  });
});

describe("hasSaflibSubmodule", () => {
  it("detects saflib in .gitmodules", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-"));
    writeFileSync(
      join(cwd, ".gitmodules"),
      '[submodule "saflib"]\n\tpath = saflib\n',
      "utf8",
    );
    expect(hasSaflibSubmodule(cwd)).toBe(true);
  });

  it("detects saflib/.git", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-"));
    mkdirSync(join(cwd, "saflib"), { recursive: true });
    writeFileSync(join(cwd, "saflib", ".git"), "gitdir: ../.git/modules/saflib", "utf8");
    expect(hasSaflibSubmodule(cwd)).toBe(true);
  });
});

describe("collisionPaths", () => {
  it("returns existing bootstrap collision paths", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-"));
    mkdirSync(join(cwd, "demo"));
    mkdirSync(join(cwd, "deploy"));
    expect(collisionPaths(cwd, "demo")).toEqual([
      join(cwd, "demo"),
      join(cwd, "deploy"),
    ]);
  });
});

describe("formatCollisionWarning", () => {
  it("lists relative paths and mentions --force", () => {
    const cwd = "/repo";
    const message = formatCollisionWarning(["/repo/demo", "/repo/.github"], cwd);
    expect(message).toContain("demo");
    expect(message).toContain(".github");
    expect(message).toContain("--force");
  });
});

describe("ensureRootPackageJson", () => {
  it("creates a root package.json when missing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-"));
    const pkg = ensureRootPackageJson(cwd, "acme");
    expect(pkg.name).toBe("@acme/acme");
    expect(pkg.workspaces).toEqual(["saflib/**"]);
  });

  it("adds saflib/** to an existing workspace list", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-"));
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify(
        {
          name: "@acme/acme",
          workspaces: ["clients/*"],
        },
        null,
        2,
      ),
      "utf8",
    );
    const pkg = ensureRootPackageJson(cwd, "acme");
    expect(pkg.workspaces).toEqual(["clients/*", "saflib/**"]);
  });
});

describe("buildRootPackageJson", () => {
  it("uses the organization for the root package name", () => {
    expect(buildRootPackageJson("acme").name).toBe("@acme/acme");
  });
});

describe("existingSaflibMessage", () => {
  it("points users at product/init", () => {
    expect(existingSaflibMessage("demo", "example.com")).toContain(
      "npm exec saf-workflow kickoff product/init demo example.com",
    );
  });
});

describe("runBootstrap", () => {
  it("runs submodule add, install, and product/init in order", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-run-"));
    execSync("git init", { cwd, stdio: "pipe" });

    const commands: string[] = [];
    runBootstrap({
      cwd,
      productName: "demo",
      domain: "example.com",
      organizationName: "demo",
      runCommand: (command) => {
        commands.push(command);
      },
    });

    expect(commands).toEqual([
      `git submodule add "https://github.com/sderickson/saflib.git" saflib`,
      'git -C saflib checkout "main"',
      "npm install",
      'npm exec saf-workflow kickoff product/init "demo" "example.com"',
    ]);
  });
});
