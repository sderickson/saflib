import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Production compose file, relative to the deploy package. */
export const PROD_COMPOSE_FILE = "remote-assets/docker-compose.prod.yaml";

/** Services deployed blue-green (optional), relative to the deploy package. */
export const BLUE_GREEN_COMPOSE_FILE =
  "remote-assets/docker-compose.blue-green.yaml";

/**
 * A product's deploy settings: the deploy package directory (holding
 * `env.remote` and `remote-assets/`) plus the values from `env.remote`.
 */
export interface DeployConfig {
  deployDir: string;
  /**
   * The selected target: `undefined` for the default (`env.remote` alone),
   * else the name whose `env.remote.<target>` overrides were layered on top.
   */
  target?: string;
  /**
   * Every `KEY=value` in `env.remote`, with the target's overrides (sent to
   * the server for remote commands).
   */
  env: Record<string, string>;
  /** `CONTAINER_REGISTRY` (the process env wins, e.g. in CI). */
  containerRegistry?: string;
  /** Absolute path of the production compose file. */
  composeFile: string;
  /** Absolute paths of every compose file whose images the deploy runs. */
  composeFiles: string[];
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

/** Where a target's overrides live: `env.remote.<target>`. */
export function targetEnvFile(deployDir: string, target: string): string {
  return path.join(deployDir, `env.remote.${target}`);
}

/** The target named by `SAF_DEPLOY_TARGET` (set by `--target`), if any. */
export function selectedTarget(): string | undefined {
  const target = process.env.SAF_DEPLOY_TARGET?.trim();
  return target && target !== "default" ? target : undefined;
}

/**
 * Loads a deploy's settings: `env.remote`, then (for a target other than the
 * default) `env.remote.<target>`'s values on top. `target` defaults to
 * {@link selectedTarget}.
 */
export function loadDeployConfig(
  deployDir: string = process.cwd(),
  target: string | undefined = selectedTarget(),
): DeployConfig {
  const envFile = path.join(deployDir, "env.remote");
  const env = existsSync(envFile)
    ? parseEnvFile(readFileSync(envFile, "utf8"))
    : {};
  if (target) {
    if (!/^[A-Za-z0-9_-]+$/.test(target)) {
      throw new Error(`Invalid deploy target "${target}"`);
    }
    const overrides = targetEnvFile(deployDir, target);
    if (!existsSync(overrides)) {
      throw new Error(
        `Deploy target "${target}" has no ${path.relative(process.cwd(), overrides) || overrides}`,
      );
    }
    Object.assign(env, parseEnvFile(readFileSync(overrides, "utf8")));
  }
  const containerRegistry =
    process.env.CONTAINER_REGISTRY || env.CONTAINER_REGISTRY;
  if (containerRegistry) env.CONTAINER_REGISTRY = containerRegistry;
  return {
    deployDir,
    target,
    env,
    containerRegistry,
    composeFile: path.join(deployDir, PROD_COMPOSE_FILE),
    composeFiles: [PROD_COMPOSE_FILE, BLUE_GREEN_COMPOSE_FILE]
      .map((file) => path.join(deployDir, file))
      .filter((file, i) => i === 0 || existsSync(file)),
  };
}

/** How to name a config's target and host in output, e.g. `next (root@host)`. */
export function describeTarget(config: DeployConfig): string {
  const host = config.env.SSH_HOSTNAME;
  const name = config.target ?? "default";
  return host ? `${name} (${host})` : name;
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
