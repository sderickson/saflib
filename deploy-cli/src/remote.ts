import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireRemote, type DeployConfig } from "./config.ts";

/** Scripts this package runs on the server (`remote-scripts/*.sh`). */
export type RemoteScript =
  | "setup"
  | "pull"
  | "up"
  | "down"
  | "logs"
  | "purge"
  | "extract-assets"
  | "register-sites"
  | "live"
  | "sites";

const SCRIPTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "remote-scripts",
);

/** Scripts that use sites.sh's functions (route registration, blue-green). */
const NEEDS_SITES = new Set<RemoteScript>([
  "up",
  "down",
  "register-sites",
  "live",
]);

export function readRemoteScript(name: RemoteScript): string {
  const script = readFileSync(path.join(SCRIPTS_DIR, `${name}.sh`), "utf8");
  return NEEDS_SITES.has(name)
    ? `${readFileSync(path.join(SCRIPTS_DIR, "sites.sh"), "utf8")}\n${script}`
    : script;
}

/**
 * The deploy's name (the server folder's basename, e.g. `recipes`), which
 * names its blue-green compose projects. Local runs point
 * REMOTE_ASSETS_FOLDER_PATH elsewhere, so it's passed explicitly.
 */
function deployNameEnv(config: DeployConfig): Record<string, string> {
  const folder = config.env.REMOTE_ASSETS_FOLDER_PATH;
  const env: Record<string, string> = folder
    ? { SAF_DEPLOY_NAME: path.basename(folder) }
    : {};
  // Blue-green timing can be set per run, e.g. SAF_WATCH_SECONDS=120.
  for (const key of ["SAF_HEALTH_TIMEOUT", "SAF_WATCH_SECONDS"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

/** Single-quotes a value for bash. */
/** `up`, which registers the deploy's edge routes (no-op without remote-assets/caddy/). */
export function upScript(): string {
  return readRemoteScript("up");
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * What's piped to `ssh <host> 'bash -s'`: an optional `sudo -i` (unless
 * `REMOTE_SUDO=0` in env.remote), every env.remote value exported (compose
 * interpolates `$CONTAINER_REGISTRY`), `SUDO` for non-docker root steps,
 * `docker_cmd` for docker/compose (sudo passes `CONTAINER_REGISTRY` through),
 * then the script.
 */
export function remotePayload(
  config: DeployConfig,
  script: string,
  extraEnv: Record<string, string> = {},
): string {
  const lines: string[] = [];
  if (config.env.REMOTE_SUDO !== "0") lines.push("sudo -i");
  for (const [key, value] of Object.entries({
    ...config.env,
    ...deployNameEnv(config),
    ...extraEnv,
  })) {
    lines.push(`export ${key}=${shellQuote(value)}`);
  }
  lines.push('SUDO=$([ "$(id -u)" = 0 ] || echo sudo)');
  lines.push(
    "docker_cmd() {",
    '  if [ "$(id -u)" = 0 ]; then docker "$@";',
    '  else sudo CONTAINER_REGISTRY="$CONTAINER_REGISTRY" SAF_COLOR="${SAF_COLOR:-}" docker "$@"; fi',
    "}",
  );
  lines.push("set -e", script);
  return lines.join("\n") + "\n";
}

/**
 * Like {@link remotePayload}, for running a server script against the local
 * Docker (e.g. a prod-local stack): no sudo, and REMOTE_ASSETS_FOLDER_PATH
 * pointing at this deploy package's own remote-assets/.
 */
export function localPayload(config: DeployConfig, script: string): string {
  // Blue-green services locally: a prod-local overlay beside remote-assets/
  // (e.g. with prod-local env files), when the deploy has one.
  const blueGreenOverlay = path.join(
    config.deployDir,
    "docker-compose.blue-green.prod-local.yaml",
  );
  const env = {
    ...config.env,
    ...deployNameEnv(config),
    REMOTE_ASSETS_FOLDER_PATH: path.join(config.deployDir, "remote-assets"),
    SAF_DEPLOY_LOCAL: "1",
    ...(existsSync(blueGreenOverlay)
      ? { SAF_BLUE_GREEN_COMPOSE: blueGreenOverlay }
      : {}),
  };
  const lines: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    lines.push(`export ${key}=${shellQuote(value)}`);
  }
  lines.push("SUDO=", 'docker_cmd() { docker "$@"; }', "set -e", script);
  return lines.join("\n") + "\n";
}

export async function runLocal(
  config: DeployConfig,
  script: string,
): Promise<void> {
  await run("bash", ["-s"], { input: localPayload(config, script) });
}

export function run(
  command: string,
  args: string[],
  options: { input?: string; cwd?: string } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: [
        options.input === undefined ? "inherit" : "pipe",
        "inherit",
        "inherit",
      ],
    });
    if (options.input !== undefined) child.stdin!.end(options.input);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args[0] ?? ""} exited with ${code}`)),
    );
  });
}

/** Runs `script` on the server over ssh, with env.remote available. */
export async function runRemote(
  config: DeployConfig,
  script: string,
  extraEnv: Record<string, string> = {},
): Promise<void> {
  const { sshHostname } = requireRemote(config);
  await run("ssh", [sshHostname, "bash -s"], {
    input: remotePayload(config, script, extraEnv),
  });
}

/**
 * Uploads `remote-assets/` to `REMOTE_ASSETS_FOLDER_PATH`: zip, sftp to
 * `REMOTE_ZIP_PATH`, then unzip and rsync on the server (rsync keeps
 * directory inodes, so containers' bind mounts survive).
 */
export async function syncAssets(config: DeployConfig): Promise<void> {
  const { sshHostname, remoteZipPath, remoteAssetsPath } =
    requireRemote(config);
  const zipName = "deploy-instance.zip";
  const zipPath = path.join(config.deployDir, zipName);
  console.log(`Zipping remote-assets for ${sshHostname}:${remoteAssetsPath}…`);
  await run("zip", ["-qr", zipPath, "."], {
    cwd: path.join(config.deployDir, "remote-assets"),
  });
  try {
    console.log("Uploading…");
    await run("sftp", ["-q", sshHostname], {
      input: `put ${shellQuote(zipPath)} ${shellQuote(`${remoteZipPath}/${zipName}`)}\nexit\n`,
    });
    console.log("Extracting on the server…");
    await runRemote(config, readRemoteScript("extract-assets"), {
      ZIP_NAME: zipName,
    });
  } finally {
    await run("rm", ["-f", zipPath]);
  }
}
