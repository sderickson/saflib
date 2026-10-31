/**
 * Dev-stack dependency install, run by the `deps` service before the Node
 * services start. Source is bind-mounted at /app and node_modules is a named
 * volume, so the host's (macOS) node_modules never reach Linux containers.
 *
 * Runs `npm ci` only when the lockfile (or root package.json, Node or npm
 * version) changed since the last install into this volume, so restarting the
 * stack is quick and adding a dependency doesn't need an image rebuild.
 *
 * Fails first if the lockfile installs any package below a workspace directory:
 * product and saflib packages should all resolve to the same versions.
 *
 * Uses only Node built-ins: it runs before node_modules exists.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.env.SAF_DEV_INSTALL_ROOT ?? "/app";
const NODE_MODULES = path.join(ROOT, "node_modules");
const STAMP_PATH = path.join(NODE_MODULES, ".saf-dev-install.json");
const NPM_CI_ARGS = ["ci", "--omit=dev", "--no-audit", "--no-fund"];

function npmVersion(): string {
  const out = spawnSync("npm", ["--version"], { encoding: "utf8" });
  return out.stdout.trim();
}

function installHash(): string {
  const hash = createHash("sha256");
  for (const file of ["package-lock.json", "package.json"]) {
    hash.update(file);
    hash.update(readFileSync(path.join(ROOT, file)));
  }
  hash.update(process.version);
  hash.update(npmVersion());
  hash.update(NPM_CI_ARGS.join(" "));
  return hash.digest("hex");
}

function readStamp(): string | undefined {
  if (!existsSync(STAMP_PATH)) return undefined;
  try {
    return (JSON.parse(readFileSync(STAMP_PATH, "utf8")) as { hash?: string })
      .hash;
  } catch {
    return undefined;
  }
}

type LockPackages = Record<
  string,
  {
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  }
>;

function readLockPackages(): LockPackages {
  return (
    JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as {
      packages?: LockPackages;
    }
  ).packages ?? {};
}

const isWorkspaceKey = (key: string) =>
  key !== "" && !key.startsWith("node_modules/") && !key.includes("/node_modules/");

function requestedRange(
  entry: LockPackages[string],
  name: string,
): string | undefined {
  return (
    entry.dependencies?.[name] ??
    entry.devDependencies?.[name] ??
    entry.peerDependencies?.[name] ??
    entry.optionalDependencies?.[name]
  );
}

/** The lockfile entry Node would load for `name` from `requester`'s directory. */
function resolvesTo(
  packages: LockPackages,
  requester: string,
  name: string,
): string | undefined {
  let dir = requester;
  for (;;) {
    const candidate = dir ? `${dir}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!dir) return undefined;
    dir = parentDir(dir);
  }
}

/** One directory up from a lockfile key, the way Node walks for node_modules. */
function parentDir(dir: string): string {
  const nm = dir.lastIndexOf("/node_modules/");
  if (nm !== -1) return dir.slice(0, nm); // out of a nested package
  if (dir.startsWith("node_modules/")) return ""; // out of a root package
  const slash = dir.lastIndexOf("/");
  return slash === -1 ? "" : dir.slice(0, slash); // up a workspace path
}

/**
 * Packages the lockfile installs below a workspace directory instead of at the
 * root: some workspace packages (product or saflib) want a version the root
 * can't share. Every workspace package should resolve each dependency to the
 * same version, so this fails the install.
 */
function misalignedVersions(packages: LockPackages): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(packages)) {
    if (key.startsWith("node_modules/") || !key.includes("/node_modules/")) {
      continue;
    }
    const [dir, rest] = key.split(/\/node_modules\/(.*)/s) as [string, string];
    // Only the top of each nested tree; deeper entries belong to it.
    if (rest.includes("/node_modules/")) continue;
    const name = rest;
    const nestedLines: string[] = [];
    const rootLines: string[] = [];
    for (const [requester, entry] of Object.entries(packages)) {
      const range = requestedRange(entry, name);
      if (!range) continue;
      const underDir =
        isWorkspaceKey(requester) &&
        (requester === dir || requester.startsWith(`${dir}/`));
      if (underDir) {
        nestedLines.push(`${requester || "(root)"} wants ${range}`);
      } else if (resolvesTo(packages, requester, name) === `node_modules/${name}`) {
        rootLines.push(`${requester.replace(/^node_modules\//, "") || "(root)"} wants ${range}`);
      }
    }
    problems.push(
      [
        `  ${name}: ${packages[key]!.version} installed under ${dir}/node_modules, ${packages[`node_modules/${name}`]?.version ?? "(none)"} at the root`,
        `    ${packages[key]!.version}: ${nestedLines.join("; ") || "(no direct requester)"}`,
        `    root: ${rootLines.join("; ") || "(no direct requester)"}`,
      ].join("\n"),
    );
  }
  return problems;
}

/**
 * Workspace-level node_modules on the host, e.g. from installing a submodule
 * on its own. Node resolves those before /app/node_modules, so their host
 * (macOS) builds can break the container.
 */
function strayNestedNodeModules(packages: LockPackages): string[] {
  return Object.keys(packages)
    .filter(isWorkspaceKey)
    .filter((dir) => {
      const nm = path.join(ROOT, dir, "node_modules");
      if (!existsSync(nm)) return false;
      return readdirSync(nm).some((entry) => !entry.startsWith("."));
    });
}

const packages = readLockPackages();
const misaligned = misalignedVersions(packages);
if (misaligned.length > 0) {
  console.error(
    `[deps] Dependency versions are out of alignment: these workspace packages can't share the root's version.\n${misaligned.join("\n")}\n` +
      `[deps] Align the version ranges, or add an "overrides" entry in the root package.json, then npm install.`,
  );
  process.exit(1);
}

const hash = installHash();
if (readStamp() === hash) {
  console.log("[deps] node_modules up to date.");
} else {
  console.log("[deps] Lockfile changed (or first run): running npm ci...");
  const result = spawnSync("npm", NPM_CI_ARGS, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    console.error("[deps] npm ci failed.");
    process.exit(result.status ?? 1);
  }
  writeFileSync(STAMP_PATH, JSON.stringify({ hash }, null, 2) + "\n");
  console.log("[deps] npm ci done.");
}

const stray = strayNestedNodeModules(packages);
if (stray.length > 0) {
  console.warn(
    `[deps] Warning: these workspace-level node_modules exist on the host, and Node in the container resolves them before /app/node_modules. If anything fails to load, delete them on the host (a submodule's own install can recreate them):\n${stray
      .map((dir) => `  ${dir}/node_modules`)
      .join("\n")}`,
  );
}
