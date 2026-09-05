import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_DEPLOY_DIR,
  DEFAULT_SAFLIB_REF,
  DEFAULT_SAFLIB_REPO,
  PRODUCT_NAME_PATTERN,
} from "./constants.ts";

export interface BootstrapOptions {
  cwd: string;
  productName: string;
  domain: string;
  organizationName: string;
  saflibRef?: string;
  force?: boolean;
  runCommand?: (command: string, options: { cwd: string }) => void;
}

export interface PackageJsonShape {
  name?: string;
  workspaces?: string[];
  [key: string]: unknown;
}

export function shellQuote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function assertInsideGitRepository(cwd: string): void {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd,
      stdio: "pipe",
    });
  } catch {
    throw new Error(
      "This directory is not a git repository. Run `git init` first, then retry saf-create.",
    );
  }
}

export function ensureInitialCommit(cwd: string): void {
  try {
    execSync("git rev-parse HEAD", { cwd, stdio: "pipe" });
    return;
  } catch {
    execSync('git commit --allow-empty -m "chore: initialize repository"', {
      cwd,
      stdio: "inherit",
    });
  }
}

export function hasSaflibSubmodule(cwd: string): boolean {
  const gitmodulesPath = join(cwd, ".gitmodules");
  if (existsSync(gitmodulesPath)) {
    const content = readFileSync(gitmodulesPath, "utf8");
    if (/\[submodule "saflib"\]/.test(content)) {
      return true;
    }
  }

  const saflibGitPath = join(cwd, "saflib", ".git");
  return existsSync(saflibGitPath);
}

export function existingSaflibMessage(
  productName: string,
  domain: string,
): string {
  return [
    "This repository already includes a saflib submodule.",
    "",
    "Use the existing product/init workflow from the monorepo root instead:",
    "",
    `  npm exec saf-workflow kickoff product/init ${productName} ${domain}`,
    "",
    "See saflib/product/docs/workflows/create.md for details.",
  ].join("\n");
}

export function validateProductName(productName: string): void {
  if (!PRODUCT_NAME_PATTERN.test(productName)) {
    throw new Error(
      `Invalid product name "${productName}". Use kebab-case starting with a letter (example: my-app).`,
    );
  }
}

export function resolveOrganizationName(
  productName: string,
  org?: string,
): string {
  const organizationName = (org ?? productName).trim();
  if (!PRODUCT_NAME_PATTERN.test(organizationName)) {
    throw new Error(
      `Invalid organization name "${organizationName}". Use kebab-case starting with a letter.`,
    );
  }
  return organizationName;
}

export function collisionPaths(
  cwd: string,
  productName: string,
  deployDir = DEFAULT_DEPLOY_DIR,
): string[] {
  return [join(cwd, productName), join(cwd, deployDir), join(cwd, ".github")].filter(
    (path) => existsSync(path),
  );
}

export function formatCollisionWarning(paths: string[], cwd: string): string {
  const relativePaths = paths.map((path) =>
    path.startsWith(cwd + "/") ? path.slice(cwd.length + 1) : path,
  );
  return [
    "The following paths already exist and product/init would overwrite parts of them:",
    ...relativePaths.map((path) => `- ${path}`),
    "",
    "Re-run with --force to continue anyway.",
  ].join("\n");
}

export function buildRootPackageJson(
  organizationName: string,
): PackageJsonShape {
  return {
    name: `@${organizationName}/${organizationName}`,
    private: true,
    description: "SAF monorepo",
    type: "module",
    workspaces: ["saflib/**"],
    engines: {
      node: ">=22",
    },
  };
}

export function readPackageJson(cwd: string): PackageJsonShape | undefined {
  const packageJsonPath = join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) {
    return undefined;
  }
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonShape;
}

export function ensureRootPackageJson(
  cwd: string,
  organizationName: string,
): PackageJsonShape {
  const packageJsonPath = join(cwd, "package.json");
  const existing = readPackageJson(cwd);

  if (!existing) {
    const created = buildRootPackageJson(organizationName);
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify(created, null, 2)}\n`,
      "utf8",
    );
    return created;
  }

  if (!existing.name) {
    throw new Error(
      "package.json exists but has no name field. Add a scoped name like @my-org/my-org or start from an empty repository.",
    );
  }

  const workspaces = Array.from(
    new Set([...(existing.workspaces ?? []), "saflib/**"]),
  ).sort();

  const updated = {
    ...existing,
    workspaces,
  };
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(updated, null, 2)}\n`,
    "utf8",
  );
  return updated;
}

export function addSaflibSubmodule(
  cwd: string,
  repo: string,
  ref: string,
  runCommand: BootstrapOptions["runCommand"] = defaultRunCommand,
): void {
  const saflibPath = join(cwd, "saflib");
  if (existsSync(saflibPath)) {
    throw new Error(
      "Path saflib/ already exists but is not configured as a submodule.",
    );
  }

  runCommand(`git submodule add ${shellQuote(repo)} saflib`, { cwd });
  runCommand(`git -C saflib checkout ${shellQuote(ref)}`, { cwd });
}

function defaultRunCommand(command: string, options: { cwd: string }): void {
  try {
    execSync(command, {
      cwd: options.cwd,
      stdio: "inherit",
      shell: true,
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 1;
    throw new Error(
      `Command failed (exit ${status}): ${command}\n` +
        "See git/npm output above for details.",
    );
  }
}

export function runBootstrap(options: BootstrapOptions): void {
  const cwd = options.cwd;
  const saflibRef = options.saflibRef ?? DEFAULT_SAFLIB_REF;
  const runCommand = options.runCommand ?? defaultRunCommand;

  validateProductName(options.productName);
  assertInsideGitRepository(cwd);
  ensureInitialCommit(cwd);

  if (hasSaflibSubmodule(cwd)) {
    throw new Error(
      existingSaflibMessage(options.productName, options.domain),
    );
  }

  const collisions = collisionPaths(cwd, options.productName);
  if (collisions.length > 0 && !options.force) {
    throw new Error(formatCollisionWarning(collisions, cwd));
  }

  ensureRootPackageJson(cwd, options.organizationName);
  addSaflibSubmodule(cwd, DEFAULT_SAFLIB_REPO, saflibRef, runCommand);

  runCommand("npm install", { cwd });

  runCommand(
    [
      "npm exec saf-workflow kickoff product/init",
      shellQuote(options.productName),
      shellQuote(options.domain),
    ].join(" "),
    { cwd },
  );
}
