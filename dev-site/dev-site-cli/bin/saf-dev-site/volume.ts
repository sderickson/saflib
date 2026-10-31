import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import type { Command } from "commander";
import {
  volumeExportArgv,
  volumeImportArgv,
  volumeListArgv,
} from "../../src/volume.ts";

function docker(args: string[], capture = false): string {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`docker ${args[0]} failed (exit ${result.status ?? "?"})`);
  }
  return capture ? result.stdout : "";
}

export const addVolumeCommand = (program: Command) => {
  const volume = program
    .command("volume")
    .description(
      "Copy dev data between host folders and the stack's named volumes. Stop the stack first so SQLite files are consistent.",
    );

  volume
    .command("import <volume> <dir>")
    .description(
      "Copy a host folder's contents into a named volume (e.g. to move existing dev data into it).",
    )
    .option("--force", "Copy even if the volume already has data")
    .action((name: string, dir: string, options: { force?: boolean }) => {
      if (!existsSync(dir)) {
        throw new Error(`No such folder: ${dir}`);
      }
      docker(["volume", "create", name], true);
      const existing = docker(volumeListArgv(name), true).trim();
      if (existing && !options.force) {
        throw new Error(
          `Volume ${name} already has data; pass --force to copy over it.`,
        );
      }
      docker(volumeImportArgv(name, dir));
      console.error(`dev-site: copied ${dir} into volume ${name}`);
    });

  volume
    .command("export <volume> <dir>")
    .description(
      "Copy a named volume's contents into a host folder (a snapshot to inspect, e.g. with sqlite3, or to keep as a backup).",
    )
    .action((name: string, dir: string) => {
      mkdirSync(dir, { recursive: true });
      docker(volumeExportArgv(name, dir));
      console.error(`dev-site: copied volume ${name} into ${dir}`);
    });
};
