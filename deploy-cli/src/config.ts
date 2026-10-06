import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Production compose file, relative to the deploy package. */
export const PROD_COMPOSE_FILE = "remote-assets/docker-compose.prod.yaml";

/**
 * A product's deploy settings: the deploy package directory (holding
 * `env.remote` and `remote-assets/`) plus the values from `env.remote`.
 */
export interface DeployConfig {
  deployDir: string;
  /** Every `KEY=value` in `env.remote` (sent to the server for remote commands). */
  env: Record<string, string>;
  /** `CONTAINER_REGISTRY` (the process env wins, e.g. in CI). */
  containerRegistry?: string;
  /** Absolute path of the production compose file. */
  composeFile: string;
}

/** Parses `KEY=value` lines (comments and blanks skipped, quotes stripped). */
export function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of contents.split(/\r?\n/)) {
    const match = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

export function loadDeployConfig(
  deployDir: string = process.cwd(),
): DeployConfig {
  const envFile = path.join(deployDir, "env.remote");
  const env = existsSync(envFile)
    ? parseEnvFile(readFileSync(envFile, "utf8"))
    : {};
  const containerRegistry =
    process.env.CONTAINER_REGISTRY || env.CONTAINER_REGISTRY;
  if (containerRegistry) env.CONTAINER_REGISTRY = containerRegistry;
  return {
    deployDir,
    env,
    containerRegistry,
    composeFile: path.join(deployDir, PROD_COMPOSE_FILE),
  };
}

/** The values remote commands need; throws naming whatever is missing. */
export function requireRemote(config: DeployConfig): {
  sshHostname: string;
  remoteZipPath: string;
  remoteAssetsPath: string;
} {
  const keys = ["SSH_HOSTNAME", "REMOTE_ZIP_PATH", "REMOTE_ASSETS_FOLDER_PATH"];
  const missing = keys.filter((key) => !config.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `${path.join(config.deployDir, "env.remote")} is missing ${missing.join(", ")}`,
    );
  }
  return {
    sshHostname: config.env.SSH_HOSTNAME,
    remoteZipPath: config.env.REMOTE_ZIP_PATH,
    remoteAssetsPath: config.env.REMOTE_ASSETS_FOLDER_PATH,
  };
}

export function requireRegistry(config: DeployConfig): string {
  if (!config.containerRegistry) {
    throw new Error(
      `No container registry: set CONTAINER_REGISTRY in ${path.join(config.deployDir, "env.remote")} or the environment`,
    );
  }
  return config.containerRegistry;
}
