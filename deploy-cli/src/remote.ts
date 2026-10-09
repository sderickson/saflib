import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireRemote, type DeployConfig } from "./config.ts";

/** Scripts this package runs on the server (`remote-scripts/*.sh`). */
export type RemoteScript =
  "setup" | "pull" | "up" | "down" | "logs" | "purge" | "extract-assets";

const SCRIPTS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "remote-scripts",
);

export function readRemoteScript(name: RemoteScript): string {
  return readFileSync(path.join(SCRIPTS_DIR, `${name}.sh`), "utf8");
}

/** Single-quotes a value for bash. */
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
  for (const [key, value] of Object.entries({ ...config.env, ...extraEnv })) {
    lines.push(`export ${key}=${shellQuote(value)}`);
  }
  lines.push('SUDO=$([ "$(id -u)" = 0 ] || echo sudo)');
  lines.push(
    "docker_cmd() {",
    '  if [ "$(id -u)" = 0 ]; then docker "$@";',
    '  else sudo CONTAINER_REGISTRY="$CONTAINER_REGISTRY" docker "$@"; fi',
    "}",
  );
  lines.push("set -e", script);
  return lines.join("\n") + "\n";
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
