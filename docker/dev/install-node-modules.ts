/**
 * Dev-stack dependency install, run by the `deps` service before the Node
 * services start. Source is bind-mounted at /app and node_modules is a named
 * volume, so the host's (macOS) node_modules never reach Linux containers.
 *
 * Runs `npm ci` only when the lockfile (or root package.json, Node or npm
 * version) changed since the last install into this volume, so restarting the
 * stack is quick and adding a dependency doesn't need an image rebuild.
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

/**
 * Workspace-level node_modules the lockfile doesn't call for, e.g. left over
 * from installing a submodule on its own. Node resolves those before
 * /app/node_modules, so their host (macOS) builds can break the container.
 */
function strayNestedNodeModules(): string[] {
  const lock = JSON.parse(
    readFileSync(path.join(ROOT, "package-lock.json"), "utf8"),
  ) as { packages?: Record<string, unknown> };
  const keys = Object.keys(lock.packages ?? {});
  const workspaceDirs = keys.filter(
    (k) => k !== "" && !k.startsWith("node_modules/") && !k.includes("/node_modules/"),
  );
  const expected = new Set(
    keys
      .filter((k) => !k.startsWith("node_modules/") && k.includes("/node_modules/"))
      .map((k) => k.split("/node_modules/")[0]),
  );
  return workspaceDirs.filter((dir) => {
    if (expected.has(dir)) return false;
    const nm = path.join(ROOT, dir, "node_modules");
    if (!existsSync(nm)) return false;
    return readdirSync(nm).some((entry) => !entry.startsWith("."));
  });
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

const stray = strayNestedNodeModules();
if (stray.length > 0) {
  console.warn(
    `[deps] Warning: these node_modules aren't in this lockfile, and Node in the container resolves them before /app/node_modules. If anything fails to load, delete them on the host (a submodule's own install can recreate them):\n${stray
      .map((dir) => `  ${dir}/node_modules`)
      .join("\n")}`,
  );
}
