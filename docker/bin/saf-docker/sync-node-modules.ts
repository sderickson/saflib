import { execFileSync } from "node:child_process";
import type { Command } from "commander";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import {
  planVolumeSyncs,
  readVolumeStamps,
  writeVolumeStamps,
  type ComposeConfig,
} from "../../src/sync-node-modules-volumes.ts";

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function dockerComposeArgs(opts: {
  file: string[];
  envFile: string[];
}): string[] {
  const args: string[] = [];
  for (const envFile of opts.envFile) {
    args.push("--env-file", envFile);
  }
  const files = opts.file.length > 0 ? opts.file : ["docker-compose.yaml"];
  for (const file of files) {
    args.push("-f", file);
  }
  return args;
}

function loadComposeConfig(composeArgs: string[], cwd: string): ComposeConfig {
  const raw = execFileSync(
    "docker",
    ["compose", ...composeArgs, "config", "--format", "json"],
    { cwd, encoding: "utf-8" },
  );
  return JSON.parse(raw) as ComposeConfig;
}

function volumeExists(volumeName: string): boolean {
  try {
    execFileSync("docker", ["volume", "inspect", volumeName], {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function stopService(composeArgs: string[], cwd: string, serviceName: string) {
  try {
    execFileSync("docker", ["compose", ...composeArgs, "stop", serviceName], {
      cwd,
      stdio: "pipe",
    });
  } catch {
    // Service may not be running.
  }
  try {
    execFileSync("docker", ["compose", ...composeArgs, "rm", "-f", serviceName], {
      cwd,
      stdio: "pipe",
    });
  } catch {
    // Container may not exist.
  }
}

function removeVolume(volumeName: string) {
  execFileSync("docker", ["volume", "rm", "-f", volumeName], {
    stdio: "pipe",
  });
}

export const addSyncNodeModulesCommand = (program: Command) => {
  program
    .command("sync-node-modules")
    .description(
      "Delete named /app/node_modules volumes when their saf-docker install stage hash changes.",
    )
    .option(
      "-f, --file <path>",
      "Compose file (repeatable; default docker-compose.yaml)",
      collect,
      [] as string[],
    )
    .option(
      "--env-file <path>",
      "Compose env file (repeatable)",
      collect,
      [] as string[],
    )
    .option(
      "--cwd <path>",
      "Working directory for docker compose (default: process cwd)",
    )
    .action((options: { file: string[]; envFile: string[]; cwd?: string }) => {
      const cwd = options.cwd ? options.cwd : process.cwd();
      const composeArgs = dockerComposeArgs(options);
      const repoRoot = buildMonorepoContext().rootDir;
      const config = loadComposeConfig(composeArgs, cwd);
      const stamps = readVolumeStamps(repoRoot);
      const decisions = planVolumeSyncs({
        config,
        repoRoot,
        stamps,
        volumeExists,
      });

      if (decisions.length === 0) {
        console.log(
          "saf-docker sync-node-modules: no /app/node_modules named volumes found.",
        );
        return;
      }

      let refreshed = 0;
      for (const decision of decisions) {
        const { target, action, reason, stageHash } = decision;
        if (action === "reuse") {
          console.log(
            `reusing ${target.volumeKey} (${target.volumeName}; stage hash unchanged)`,
          );
          continue;
        }

        const reasonLabel =
          reason === "stamp-mismatch"
            ? "stage hash changed"
            : reason === "no-stamp"
              ? "no prior stamp"
              : "volume missing";
        console.log(
          `refreshing ${target.volumeKey} (${target.volumeName}; ${reasonLabel})`,
        );
        stopService(composeArgs, cwd, target.serviceName);
        if (volumeExists(target.volumeName)) {
          removeVolume(target.volumeName);
        }
        stamps[target.volumeName] = stageHash;
        refreshed += 1;
      }

      writeVolumeStamps(repoRoot, stamps);
      console.log(
        `saf-docker sync-node-modules: ${refreshed} refreshed, ${decisions.length - refreshed} reused.`,
      );
    });
};
