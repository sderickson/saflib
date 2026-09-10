import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  buildRootPackageJson,
  collisionPaths,
  ensureRootPackageJson,
  existingSaflibMessage,
  formatCollisionWarning,
  hasSaflibSubmodule,
  resolveOrganizationName,
  runBootstrap,
  syncSaflibOverridesIntoProductRoot,
  validateProductName,
} from "./bootstrap.ts";
import { materializeMonorepoScaffold } from "./scaffold.ts";
import { assertNodeVersion } from "./version.ts";

const saflibRoot = fileURLToPath(new URL("../..", import.meta.url));

describe("assertNodeVersion", () => {
  it("accepts Node 26+", () => {
    expect(() => assertNodeVersion("26.0.0")).not.toThrow();
    expect(() => assertNodeVersion("27.1.0")).not.toThrow();
  });

  it("rejects older Node versions", () => {
    expect(() => assertNodeVersion("25.9.0")).toThrow(/Node\.js 26\+/);
  });
});

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
    writeFileSync(
      join(cwd, "saflib", ".git"),
      "gitdir: ../.git/modules/saflib",
      "utf8",
    );
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
    expect(pkg.workspaces).toEqual(["deploy/**", "saflib/**"]);
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
    expect(pkg.workspaces).toEqual(["clients/*", "deploy/**", "saflib/**"]);
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

describe("materializeMonorepoScaffold", () => {
  it("writes root scaffold files including .gitignore", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-scaffold-"));
    materializeMonorepoScaffold({
      cwd,
      saflibPath: saflibRoot,
      log: () => {},
    });

    expect(existsSync(join(cwd, ".gitignore"))).toBe(true);
    expect(readFileSync(join(cwd, ".gitignore"), "utf8")).toContain("node_modules");
    expect(existsSync(join(cwd, "eslint.config.js"))).toBe(true);
    expect(existsSync(join(cwd, "vitest.config.ts"))).toBe(true);
  });
});

describe("syncSaflibOverridesIntoProductRoot", () => {
  it("merges saflib overrides into the product root before install", () => {
    const cwd = mkdtempSync(join(tmpdir(), "saf-create-overrides-"));
    writeFileSync(
      join(cwd, "package.json"),
      JSON.stringify(
        {
          name: "@acme/acme",
          overrides: { "better-sqlite3": "12.11.1" },
        },
        null,
        2,
      ),
      "utf8",
    );
    mkdirSync(join(cwd, "saflib"), { recursive: true });
    writeFileSync(
      join(cwd, "saflib", "package.json"),
      JSON.stringify(
        {
          name: "@saflib/saflib",
          overrides: {
            vite: "8.0.13",
            vue: "3.5.20",
            "better-sqlite3": "12.11.1",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    expect(syncSaflibOverridesIntoProductRoot(cwd)).toEqual([
      "vite@8.0.13",
      "vue@3.5.20",
    ]);

    const pkg = JSON.parse(
      readFileSync(join(cwd, "package.json"), "utf8"),
    ) as {
      overrides: Record<string, string>;
    };
    expect(pkg.overrides).toEqual({
      "better-sqlite3": "12.11.1",
      vite: "8.0.13",
      vue: "3.5.20",
    });
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
      saflibPath: saflibRoot,
      log: () => {},
      runCommand: (command) => {
        commands.push(command);
      },
    });

    expect(commands).toEqual([
      `git submodule add "https://github.com/sderickson/saflib.git" saflib`,
      'git -C saflib checkout "main"',
      "npm install --ignore-scripts",
      "node --experimental-strip-types --disable-warning=ExperimentalWarning saflib/monorepo/bin/lock-prune-run.ts --yes",
      "npm install",
      "npm approve-scripts better-sqlite3",
      "npm rebuild better-sqlite3",
      'npm exec saf-workflow kickoff product/init "demo" "example.com"',
    ]);
    expect(existsSync(join(cwd, ".gitignore"))).toBe(true);
    const pkg = JSON.parse(
      readFileSync(join(cwd, "package.json"), "utf8"),
    ) as { overrides?: Record<string, string> };
    expect(pkg.overrides?.vite).toBe("8.0.13");
    expect(pkg.overrides?.vue).toBe("3.5.20");
  });
});
